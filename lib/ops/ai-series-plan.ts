import "server-only";

import type { OpsAiProvider } from "@/lib/ops/types";

import {
  estimateGeminiCostUsd,
  estimateOpenAiCostUsd,
  type AiGenerationUsage,
} from "@/lib/ops/ai-prompt";
import {
  OPS_AI_SERIES_PLAN_SYSTEM_PROMPT,
  parseSeriesPlanPayload,
} from "@/lib/ops/ai-series-plan-prompt";
import {
  estimateSeriesPlanHeuristic,
  normalizeSeriesPlan,
  type SeriesPlanRecommendation,
} from "@/lib/ops/series-plan-heuristic";

export type OpsAiSeriesPlanContext = {
  excludedData: string;
  summary: string;
  targetCount: number;
  title: string;
  updateType: string;
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
    total_tokens?: number;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
  usageMetadata?: {
    candidatesTokenCount?: number;
    promptTokenCount?: number;
    totalTokenCount?: number;
  };
};

async function callOpenAi({
  apiKey,
  context,
  model,
}: {
  apiKey: string;
  context: OpsAiSeriesPlanContext;
  model: string;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        { content: OPS_AI_SERIES_PLAN_SYSTEM_PROMPT, role: "system" },
        { content: JSON.stringify(context), role: "user" },
      ],
      model,
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json()) as OpenAiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenAI request failed.");
  }

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  const promptTokens = payload.usage?.prompt_tokens ?? 0;
  const completionTokens = payload.usage?.completion_tokens ?? 0;

  return {
    content,
    usage: {
      completionTokens,
      estimatedCostUsd: estimateOpenAiCostUsd(model, promptTokens, completionTokens),
      promptTokens,
      totalTokens:
        payload.usage?.total_tokens ?? promptTokens + completionTokens,
    } satisfies AiGenerationUsage,
  };
}

async function callGemini({
  apiKey,
  context,
  model,
}: {
  apiKey: string;
  context: OpsAiSeriesPlanContext;
  model: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${OPS_AI_SERIES_PLAN_SYSTEM_PROMPT}\n\nAllowlisted series plan JSON:\n${JSON.stringify(context)}`,
              },
            ],
            role: "user",
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      method: "POST",
    },
  );

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini request failed.");
  }

  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!content) {
    throw new Error("Gemini returned an empty response.");
  }

  const promptTokens = payload.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = payload.usageMetadata?.candidatesTokenCount ?? 0;

  return {
    content,
    usage: {
      completionTokens,
      estimatedCostUsd: estimateGeminiCostUsd(model, promptTokens, completionTokens),
      promptTokens,
      totalTokens:
        payload.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens,
    } satisfies AiGenerationUsage,
  };
}

export async function generateOpsAiSeriesPlan({
  apiKey,
  context,
  model,
  provider,
}: {
  apiKey: string;
  context: OpsAiSeriesPlanContext;
  model: string;
  provider: Exclude<OpsAiProvider, "none">;
}) {
  const fallback = estimateSeriesPlanHeuristic(context.summary, context.targetCount);

  try {
    const result =
      provider === "gemini"
        ? await callGemini({ apiKey, context, model })
        : await callOpenAi({ apiKey, context, model });

    const parsed = parseSeriesPlanPayload(result.content);
    const plan = normalizeSeriesPlan(parsed, context.targetCount, fallback.reasoning);

    return {
      ...result.usage,
      plan,
    };
  } catch {
    return {
      completionTokens: 0,
      plan: fallback,
      promptTokens: 0,
      totalTokens: 0,
    };
  }
}

export type { SeriesPlanRecommendation };
