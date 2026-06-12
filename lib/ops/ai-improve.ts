import "server-only";

import type { OpsAiImprovedDraftProposal, OpsAiProvider } from "@/lib/ops/types";

import type { OpsAiVisibleContext } from "@/lib/ops/ai-visible-context";
import {
  estimateGeminiCostUsd,
  estimateOpenAiCostUsd,
  OPS_AI_SYSTEM_PROMPT,
  parseAiPayload,
  type AiGenerationUsage,
} from "@/lib/ops/ai-prompt";

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
  context: OpsAiVisibleContext,
  parsed: ReturnType<typeof parseAiPayload>,
) {
  const allowedDraftIds = new Set(context.platformDrafts.map((draft) => draft.id));

  return (parsed.drafts ?? [])
    .filter(
      (draft): draft is typeof draft & { platformDraftId: string; body: string } =>
        Boolean(
          draft.platformDraftId &&
            allowedDraftIds.has(draft.platformDraftId) &&
            typeof draft.body === "string" &&
            draft.body.trim(),
        ),
    )
    .map((draft) => {
      const sourceDraft = context.platformDrafts.find(
        (item) => item.id === draft.platformDraftId,
      );

      return {
        accountName: draft.accountName ?? sourceDraft?.accountName ?? "Unknown",
        body: draft.body.trim(),
        mediaNote:
          typeof draft.mediaNote === "string" && draft.mediaNote.trim()
            ? draft.mediaNote.trim()
            : "Review media metadata before posting.",
        platform:
          (draft.platform as OpsAiImprovedDraftProposal["platform"]) ??
          (sourceDraft?.platform as OpsAiImprovedDraftProposal["platform"]),
        platformDraftId: draft.platformDraftId,
        safetyNotes: Array.isArray(draft.safetyNotes)
          ? draft.safetyNotes.filter(
              (note): note is string =>
                typeof note === "string" && note.trim().length > 0,
            )
          : ["Manual review required before posting."],
        title:
          typeof draft.title === "string" && draft.title.trim()
            ? draft.title.trim()
            : sourceDraft?.title ?? "Untitled draft",
      } satisfies OpsAiImprovedDraftProposal;
    });
}

async function callOpenAi({
  apiKey,
  context,
  model,
}: {
  apiKey: string;
  context: OpsAiVisibleContext;
  model: string;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        { content: OPS_AI_SYSTEM_PROMPT, role: "system" },
        { content: JSON.stringify(context), role: "user" },
      ],
      model,
      response_format: { type: "json_object" },
      temperature: 0.4,
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
  context: OpsAiVisibleContext;
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
                text: `${OPS_AI_SYSTEM_PROMPT}\n\nAllowlisted AI context JSON:\n${JSON.stringify(context)}`,
              },
            ],
            role: "user",
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
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

export async function generateOpsAiImprovedDrafts({
  apiKey,
  context,
  model,
  provider,
}: {
  apiKey: string;
  context: OpsAiVisibleContext;
  model: string;
  provider: Exclude<OpsAiProvider, "none">;
}) {
  const result =
    provider === "gemini"
      ? await callGemini({ apiKey, context, model })
      : await callOpenAi({ apiKey, context, model });

  const proposals = mapProposals(context, parseAiPayload(result.content));

  if (proposals.length === 0) {
    throw new Error(`${provider} returned no usable draft proposals.`);
  }

  return {
    ...result.usage,
    proposals,
  };
}
