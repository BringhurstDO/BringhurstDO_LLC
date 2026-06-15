export const OPS_AI_SERIES_PLAN_SYSTEM_PROMPT = `You recommend how many social posts to schedule and over how many weeks for one metadata-only weekly summary.

Goals:
- Count distinct publishable angles in the summary — not repetition of the same theme.
- Spread posts realistically. For LinkedIn-style cadence, prefer 2–3 posts per week unless the summary is very thin or very dense.
- Fewer strong posts beat many repetitive ones.

Hard rules:
- Metadata-only business/product context. No PHI, clinical payloads, or private identifiers.
- totalPosts: integer 1–12 — distinct angles you can actually write without repeating prior posts.
- postsPerWeek: integer 1–5.
- weekCount: integer 1–8.
- Prefer totalPosts close to postsPerWeek × weekCount (may leave empty slots at the end of the final week).
- targetCount is how many accounts/platforms each receive one post per slot. totalPosts × targetCount must be ≤ 40.

Return JSON only:
{
  "totalPosts": number,
  "postsPerWeek": number,
  "weekCount": number,
  "reasoning": "brief operator-facing explanation"
}`;

export type ParsedSeriesPlanPayload = {
  postsPerWeek?: number;
  reasoning?: string;
  totalPosts?: number;
  weekCount?: number;
};

export function parseSeriesPlanPayload(raw: string): ParsedSeriesPlanPayload {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  return JSON.parse(jsonText) as ParsedSeriesPlanPayload;
}
