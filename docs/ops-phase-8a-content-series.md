# Phase 8A — Weekly Summary To Content Series

Phase 8A turns one metadata-only weekly summary into a multi-post content
series with platform-specific copy and suggested publish dates. It does **not**
schedule or autopost anything.

## Operator flow

1. Open `/ops/content/series` (also linked from Content Planning).
2. Paste a metadata-only weekly summary and series title.
3. Select source project, update type, publication targets, posts per week (1–7),
   week count (1–8), and series start date.
4. Click **Split with AI** — server validates allowlisted context, calls OpenAI
   or Gemini, and returns one proposal per schedule slot.
5. Review and edit proposals grouped by suggested date.
6. Click **Save Package** — creates a standard `OpsContentPackageRecord` with
   `contentPackage.series` metadata and per-draft `suggestedScheduledFor` /
   `seriesIndex` fields.
7. Manage posting, LinkedIn publish, and metrics in `/ops/content/new` like any
   other package.

## Schedule rules

- Start date is normalized to the Monday of that calendar week.
- Posts are spaced Mon–Fri (or fewer days when `postsPerWeek` < 5).
- Each selected publication target gets the full schedule (targets × dates).
- Hard cap: 40 total posts per split request.

## Safety

- Same metadata-only boundary as Phase 6 AI improve: no PHI, credentials, tokens,
  clinical payloads, or raw logs in input or output.
- Input and output pass `collectAiSafetyIssues` before and after the provider call.
- Output proposals are validated against the selected server-side slots before
  they are returned to the operator. The splitter blocks proposals that do not
  match a selected slot, change the platform or publication target, have an empty
  body after sanitization, or exceed that platform's configured character limit
  (`X` remains capped at one 280-character post).
- AI runs are logged in `ops_ai_runs` with `contentPackageId` set to the series id.
- Proposals are not auto-saved; the operator must explicitly save the package.

## API

`POST /ops/api/ai/split-series`

Request body:

```json
{
  "seriesTitle": "Week of June 9 — build notes",
  "seriesSummary": "Metadata-only weekly summary…",
  "sourceProjectId": "syncsoap",
  "updateType": "weekly-review",
  "seriesStartDate": "2026-06-09",
  "postsPerWeek": 3,
  "weekCount": 1,
  "publicationTargetIds": ["target-founder-linkedin", "target-bringhurstdo-linkedin"]
}
```

Response: `OpsAiSeriesSplitResponse` with `proposals[]`, `seriesId`, and `runId`.

Publication targets are resolved server-side from `opsDashboardData` so clients
cannot inject unknown targets.

## Env

Uses the same Ops AI config as improve-drafts:

- `OPS_AI_ENABLED=true`
- `OPS_AI_PROVIDER=openai` or `gemini`
- Matching provider API key
- `OPS_STORAGE_MODE=database` + `DATABASE_URL` for durable saves (optional;
  local browser mode still works)

## Out of scope (8B+)

- ~~Queued autoposting or calendar sync~~ → **8B adds calendar view; still manual publish**
- Scheduled autopost at suggested dates (Phase 8C)
- Instagram, Facebook, or X OAuth/publish
- Bulk approve or bulk publish

See `docs/ops-phase-8b-publish-calendar.md` and `docs/ops-roadmap.md`.
