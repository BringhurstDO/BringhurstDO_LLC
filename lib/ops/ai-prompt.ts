import { parseAiJsonResponse } from "@/lib/ops/parse-ai-json";

export const OPS_AI_SYSTEM_PROMPT = `You improve public marketing and social draft text for BringhurstDO Ops.

Hard rules:
- Metadata-only business/product context only. Never invent PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, cookies, tokens, private messages, raw logs, private customer or pilot names, or secret values.
- Do not include sensitive internal security findings unless they have already been rewritten as public-safe marketing language in the input.
- SyncSOAP content must stay product/business metadata only.
- Do not claim guaranteed clinical, financial, legal, billing, compliance, or patient outcomes.
- Do not say "HIPAA compliant" unless you use approved phrasing such as "designed to support HIPAA-aligned workflows".
- Preserve every exact UTM URL provided in the input when including a link.
- Do not provide autoposting, OAuth, ad-spend, or API instructions.

Publishable output rules:
- The "body" field must contain publishable social copy only — text safe to paste directly into LinkedIn, Instagram, Facebook, or X.
- Never put manual approval, manual review, autoposting/OAuth/API disclaimers, campaign slug labels, draft IDs, operator workflow notes, metadata-only language, governance/process narration, checklist language, AI-disabled/system-state language, or internal routing metadata in "body".
- "safetyNotes", operator notes, review checklist items, and "mediaNote" are internal constraints only. Do not repeat, summarize, or paraphrase them in "body".
- Strip legacy template artifacts from the input draft instead of polishing them. Rewrite into natural public marketing language.
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

export type ParsedAiDraft = {
  accountName?: string;
  body?: string;
  mediaNote?: string;
  platform?: string;
  platformDraftId?: string;
  safetyNotes?: string[];
  title?: string;
};

export type ParsedAiPayload = {
  drafts?: ParsedAiDraft[];
};

export function parseAiPayload(raw: string): ParsedAiPayload {
  return parseAiJsonResponse<ParsedAiPayload>(raw);
}

export type AiGenerationUsage = {
  completionTokens: number;
  estimatedCostUsd?: string;
  promptTokens: number;
  totalTokens: number;
};

export function estimateOpenAiCostUsd(
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

export function estimateGeminiCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
) {
  const normalized = model.toLowerCase();

  if (normalized.includes("flash")) {
    const inputRate = 0.075 / 1_000_000;
    const outputRate = 0.3 / 1_000_000;
    return ((promptTokens * inputRate) + (completionTokens * outputRate)).toFixed(
      6,
    );
  }

  return undefined;
}
