# Marketing Context Export

Ops can export a bounded **metadata-only** marketing context document for use
with Gemini, ChatGPT, or other AI tools when planning new series or reviewing
strategy.

## Routes

| Route | Format |
|-------|--------|
| `/ops/reports` | UI with JSON + Markdown export buttons |
| `GET /ops/api/marketing-context` | JSON (default) |
| `GET /ops/api/marketing-context` with `Accept: text/markdown` | Markdown |

All routes require the same Basic Auth as `/ops`.

## Data source

- **Brand profiles, audience rules, publication targets** — from static Ops config (`mock-data.ts` reference data).
- **Recent packages, calendar drafts, posted previews** — from **Postgres** when `OPS_STORAGE_MODE=database`.

Browser-local packages are **not** included in the server export (use calendar UI or JSON export from the builder for local mode).

## Included

- Brand voice, allowed topics, prohibited claims, boundaries
- Audience content-use and safety notes
- Publication targets and account status
- Recent content package titles, summaries (truncated), statuses
- Upcoming/today calendar drafts with body previews (truncated)
- Recently posted drafts tracked in Ops

## Excluded

- PHI, credentials, tokens, private messages, raw logs
- Full untruncated bodies (previews capped for safety)
- Autonomous posting or mutation

## Typical use

1. Save content packages to Postgres.
2. Open `/ops/reports` → **Marketing Context Export** → copy Markdown or JSON.
3. Paste into Gemini with a prompt like: “Given this marketing context, suggest angles for next week’s SyncSOAP update without repeating recent posts.”

Autonomous suggestion **into Ops** (idea bank) remains deferred; this export is operator-initiated only.
