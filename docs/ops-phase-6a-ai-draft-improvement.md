# BringhurstDO Ops Phase 6A AI Draft Improvement

Phase 6A adds server-side AI draft improvement only. It does not publish,
schedule, connect OAuth, mutate social accounts, or spend on ads.

## Env Vars (server-only)

- `OPS_AI_ENABLED=false|true` — must be `true` to enable generation.
- `OPS_AI_PROVIDER=openai|gemini` — selects the provider adapter.
- `OPENAI_API_KEY` — required when `OPS_AI_PROVIDER=openai`.
- `GEMINI_API_KEY` — required when `OPS_AI_PROVIDER=gemini`.
- `OPS_AI_MODEL` — optional. Defaults to `gpt-4o-mini` (OpenAI) or `gemini-2.0-flash` (Gemini).

When disabled or misconfigured, the UI shows a disabled state and
`POST /ops/api/ai/improve-drafts` returns `503`.

Gemini free tier / Google AI Studio may review prompts to improve services.
When Gemini is selected, the UI shows a provider warning to send only
public-safe marketing context from the allowlisted AI preview.

## Allowlisted AI Context

Providers receive only `OpsAiVisibleContext` — the same allowlisted fields
shown in the AI context preview plus platform draft slots. Raw content package
JSON, internal notes, credentials, raw logs, and sensitive security findings
are excluded unless manually rewritten as public-safe marketing language.

## Endpoints

- `GET /ops/api/ai/status` — public AI state for the UI (no secrets).
- `POST /ops/api/ai/improve-drafts` — generate improved draft proposals from a
  validated content package record and bounded AI context.

Both routes inherit fail-closed Basic Auth from `/ops/:path*` middleware.

## Safety

Input and output pass metadata-only validation plus AI claim checks (no PHI,
credentials, unapproved HIPAA compliance claims, or guaranteed outcome language).

Generated drafts are returned as proposals only. The operator must explicitly
apply selected proposals. Original deterministic draft bodies are preserved in
`originalDeterministicBody` for rollback.

## Database

Run `npm run db:migrate` to apply `0002_ops_ai_runs.sql`. AI run metadata is
stored in `ops_ai_runs` (model, status, token/cost estimates, safety results).
No API keys or raw prompts with secrets are stored.

## Verification

```bash
npm run lint
npm run build
npm run db:migrate
npm run db:verify
npm run ops:verify-deploy
```

With `OPS_AI_ENABLED=false`, confirm UI disabled and endpoint returns `503`.
With AI enabled locally, save a test package, generate proposals, apply after
review, and confirm rollback restores deterministic originals.
