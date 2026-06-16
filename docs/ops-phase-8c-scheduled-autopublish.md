# Phase 8C — Scheduled LinkedIn Autopublish

Phase 8C adds a daily cron job that publishes **approved**, **autopublish-enabled**
LinkedIn drafts whose `suggestedScheduledFor` matches today in the configured
timezone. This is a deliberate security-boundary change from Phase 8B manual-only
publish.

## Guardrails (fail-closed)

Autopublish runs only when **all** are true:

| Gate | Requirement |
|------|-------------|
| Global | `OPS_AUTOPUBLISH_ENABLED=true` |
| Storage | `OPS_STORAGE_MODE=database` + `DATABASE_URL` |
| LinkedIn | Phase 7A fully configured + connected account |
| Cron auth | `CRON_SECRET` set; cron route verifies `Authorization: Bearer …` |
| Draft | `autopublishEnabled=true` (explicit per-draft opt-in) |
| Draft | `status=approved` |
| Draft | `platform=LinkedIn` |
| Draft | `suggestedScheduledFor` equals today's calendar date |
| Draft | Not already posted |
| Body | Passes publishable-copy sanitization |
| Body | Contains no visible URLs |
| Link card | No attached URL/article content is sent to LinkedIn |

Skipped drafts and errors are logged in `ops_autopublish_runs`. LinkedIn publish
attempts also appear in `ops_social_publish_log`.

## Operator flow

1. Split a series (8A) or create a package with suggested dates.
2. Optionally enable **LinkedIn autopublish for this series** when saving, or toggle
   **Autopublish on schedule** per draft on the calendar (8B).
3. **Approve** each draft (autopublish never bypasses approval).
4. On the scheduled date, the cron publishes automatically — or use **Run autopublish
   now** on `/ops/content/calendar` to test.

## Cron

Vercel cron (see `vercel.json`):

- Path: `/api/cron/ops-autopublish`
- Schedule: `0 14 * * *` (14:00 UTC daily — adjust in Vercel if needed)
- Auth: `CRON_SECRET` as Bearer token (Vercel Cron sends this automatically when configured in project settings)

The cron route is **outside** `/ops` Basic Auth so Vercel can reach it without Ops credentials.

Manual test (Ops-authenticated):

- `POST /ops/api/autopublish/run`

Status for UI:

- `GET /ops/api/autopublish/status`

## Env

```env
OPS_AUTOPUBLISH_ENABLED=true
OPS_AUTOPUBLISH_TIMEZONE=America/New_York
CRON_SECRET=…
OPS_STORAGE_MODE=database
DATABASE_URL=…
OPS_LINKEDIN_ENABLED=true
# plus existing LINKEDIN_* and OPS_SOCIAL_TOKEN_SECRET
```

Run migration after deploy:

```bash
npm run db:migrate
```

## Database

`ops_autopublish_runs` — metadata-only audit rows (counts, draft ids, skip/error reasons).

## Still forbidden

- Autopublish for Instagram, Facebook, or X
- Autopublish without per-draft `autopublishEnabled`
- Autopublish for non-approved drafts
- Autopublish with visible URLs or attached link cards
- Browser localStorage packages (cron reads Postgres only)

See `docs/ops-roadmap.md` for what comes next (Phase 9+).
