import "server-only";

import type { OpsAiImprovedDraftProposal } from "@/lib/ops/types";

import type { OpsAiImproveContext } from "@/lib/ops/ai-context";

type OpenAiUsage = {
  completion_tokens?: number;
  prompt_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
  usage?: OpenAiUsage;
};

type ParsedDraft = {
  accountName?: string;
  body?: string;
  mediaNote?: string;
  platform?: string;
  platformDraftId?: string;
  safetyNotes?: string[];
  title?: string;
};

type ParsedAiPayload = {
  drafts?: ParsedDraft[];
};

const systemPrompt = `You improve public marketing and social draft text for BringhurstDO Ops.

Hard rules:
- Metadata-only business/product context only. Never invent PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, cookies, tokens, private messages, raw logs, or secret values.
- SyncSOAP content must stay product/business metadata only.
- Do not claim guaranteed clinical, financial, legal, billing, compliance, or patient outcomes.
- Do not say "HIPAA compliant" unless you use approved phrasing such as "designed to support HIPAA-aligned workflows".
- Preserve every exact UTM URL provided in the input when including a link.
- Manual human review is required before posting. Do not provide autoposting, OAuth, ad-spend, or API instructions.
- Improve clarity and platform fit without adding unsupported claims.

Return JSON only with this shape:
{
  "drafts": [
    {
      "platformDraftId": "existing draft id from input",
      "platform": "LinkedIn | Instagram | X | Facebook",
      "accountName": "account name from input",
      "title": "improved title",
      "body": "improved body",
      "mediaNote": "media note using provided metadata only",
      "safetyNotes": ["claims or phrases to review"]
    }
  ]
}

Only return drafts for platformDraftIds present in the input. Skip platforms not present.`;

function estimateOpenAiCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
) {
  const normalized = model.toLowerCase();

  if (normalized.includes("gpt-4o-mini")) {
    const inputRate = 0.15 / 1_000_000;
    const outputRate = 0.6 / 1_000_000;
    return ((promptTokens * inputRate) + (completionTokens * outputRate)).toFixed(
      6,
    );
  }

  return undefined;
}

function parseAiPayload(raw: string): ParsedAiPayload {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  return JSON.parse(jsonText) as ParsedAiPayload;
}

export async function generateOpsAiImprovedDrafts({
  apiKey,
  context,
  model,
}: {
  apiKey: string;
  context: OpsAiImproveContext;
  model: string;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      messages: [
        { content: systemPrompt, role: "system" },
        {
          content: JSON.stringify(context),
          role: "user",
        },
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

  const parsed = parseAiPayload(content);
  const allowedDraftIds = new Set(context.platformDrafts.map((draft) => draft.id));
  const proposals: OpsAiImprovedDraftProposal[] = (parsed.drafts ?? [])
    .filter(
      (draft): draft is ParsedDraft & { platformDraftId: string; body: string } =>
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
      };
    });

  if (proposals.length === 0) {
    throw new Error("OpenAI returned no usable draft proposals.");
  }

  const promptTokens = payload.usage?.prompt_tokens ?? 0;
  const completionTokens = payload.usage?.completion_tokens ?? 0;
  const totalTokens = payload.usage?.total_tokens ?? promptTokens + completionTokens;
  const estimatedCostUsd = estimateOpenAiCostUsd(
    model,
    promptTokens,
    completionTokens,
  );

  return {
    completionTokens,
    estimatedCostUsd,
    promptTokens,
    proposals,
    totalTokens,
  };
}
