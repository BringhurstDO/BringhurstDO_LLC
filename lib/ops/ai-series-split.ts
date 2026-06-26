import "server-only";

import type { OpsAiProvider } from "@/lib/ops/types";

import type { OpsAiSeriesSplitContext } from "@/lib/ops/ai-series-context";
import {
  estimateGeminiCostUsd,
  estimateOpenAiCostUsd,
  type AiGenerationUsage,
} from "@/lib/ops/ai-prompt";
import {
  mapSeriesSplitProposals,
} from "@/lib/ops/ai-series-map-proposals";
import {
  OPS_AI_SERIES_SYSTEM_PROMPT,
  parseSeriesPayload,
} from "@/lib/ops/ai-series-prompt";

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
  context: OpsAiSeriesSplitContext;
  model: string;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        { content: OPS_AI_SERIES_SYSTEM_PROMPT, role: "system" },
        { content: JSON.stringify(context), role: "user" },
      ],
      model,
      response_format: { type: "json_object" },
      temperature: 0.5,
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
  context: OpsAiSeriesSplitContext;
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
                text: `${OPS_AI_SERIES_SYSTEM_PROMPT}\n\nAllowlisted series split JSON:\n${JSON.stringify(context)}`,
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

export async function generateOpsAiSeriesSplit({
  apiKey,
  context,
  model,
  provider,
}: {
  apiKey: string;
  context: OpsAiSeriesSplitContext;
  model: string;
  provider: Exclude<OpsAiProvider, "none">;
}) {
  const result =
    provider === "gemini"
      ? await callGemini({ apiKey, context, model })
      : await callOpenAi({ apiKey, context, model });

  const parsed = (() => {
    try {
      return parseSeriesPayload(result.content);
    } catch {
      return { posts: [] };
    }
  })();

  const proposals = mapSeriesSplitProposals(context, parsed.posts);

  if (proposals.length === 0) {
    throw new Error(
      "No publish slots were built for this schedule. Move the start date earlier, increase posts per week, or add weeks, then split again.",
    );
  }

  if (proposals.length !== context.slots.length) {
    throw new Error(
      `${provider} returned ${proposals.length} posts but ${context.slots.length} were required.`,
    );
  }

  return {
    ...result.usage,
    proposals,
    seriesId: context.series.id,
  };
}
