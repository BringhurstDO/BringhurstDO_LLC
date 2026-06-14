import "server-only";

import type { OpsAiProvider, OpsAiSeriesSplitProposal } from "@/lib/ops/types";

import type { OpsAiSeriesSplitContext } from "@/lib/ops/ai-series-context";
import {
  estimateGeminiCostUsd,
  estimateOpenAiCostUsd,
  type AiGenerationUsage,
} from "@/lib/ops/ai-prompt";
import {
  OPS_AI_SERIES_SYSTEM_PROMPT,
  parseSeriesPayload,
} from "@/lib/ops/ai-series-prompt";
import { sanitizePublishableBody } from "@/lib/ops/publishable-copy";

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

function mapProposals(
  context: OpsAiSeriesSplitContext,
  parsed: ReturnType<typeof parseSeriesPayload>,
) {
  const slotById = new Map(context.slots.map((slot) => [slot.slotId, slot]));

  return (parsed.posts ?? [])
    .filter(
      (post): post is typeof post & { slotId: string; body: string } =>
        Boolean(
          post.slotId &&
            slotById.has(post.slotId) &&
            typeof post.body === "string" &&
            post.body.trim(),
        ),
    )
    .map((post) => {
      const slot = slotById.get(post.slotId)!;

      return {
        accountName: slot.accountName,
        body: sanitizePublishableBody(post.body.trim()),
        mediaNote:
          typeof post.mediaNote === "string" && post.mediaNote.trim()
            ? post.mediaNote.trim()
            : "Review media metadata before posting.",
        platform: slot.platform,
        proposalId: post.slotId,
        publicationTargetId: slot.publicationTargetId,
        safetyNotes: Array.isArray(post.safetyNotes)
          ? post.safetyNotes.filter(
              (note): note is string =>
                typeof note === "string" && note.trim().length > 0,
            )
          : ["Manual review required before posting."],
        seriesIndex: slot.seriesIndex,
        suggestedScheduledFor: slot.suggestedScheduledFor,
        title:
          typeof post.title === "string" && post.title.trim()
            ? post.title.trim()
            : `${context.series.title} — ${slot.seriesIndex}`,
      } satisfies OpsAiSeriesSplitProposal;
    });
}

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

  const proposals = mapProposals(context, parseSeriesPayload(result.content));

  if (proposals.length === 0) {
    throw new Error(`${provider} returned no usable series post proposals.`);
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
