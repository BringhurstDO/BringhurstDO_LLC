# Phase 8C - Scheduled Autopublish

Phase 8C publishes approved, autopublish-enabled LinkedIn and X drafts when the
draft's date and schedule bucket are due. This remains a deliberate
security-boundary change from Phase 8B manual-only publishing.

## Guardrails

Autopublish runs only when all are true:

| Gate | Requirement |
| --- | --- |
| Global | `OPS_AUTOPUBLISH_ENABLED=true` |
| Storage | `OPS_STORAGE_MODE=database` and `DATABASE_URL` |
| Platform | LinkedIn or X OAuth is configured and connected |
| Cron auth | `CRON_SECRET` is set and request has `Authorization: Bearer ...` |
| Draft | `autopublishEnabled=true` |
| Draft | `status=approved` |
| Draft | `platform=LinkedIn` or `platform=X` |
| Draft | `suggestedScheduledFor` equals today's local calendar date |
| Draft | `suggestedScheduleBucketId` matches the current cron bucket |
| Draft | Not already posted |
| Body | Passes publishable-copy sanitization |

X direct-message scopes are forbidden. X read/write access means public post
publishing plus weekly public post metric readback only.

## Operator Flow

1. Split a series or create a content package with suggested dates.
2. Choose a schedule bucket per draft: 09:00, 12:00, 15:00, 18:00, or 21:00.
3. Toggle **Autopublish on schedule** for supported drafts.
4. Approve each draft. Autopublish never bypasses approval.
5. On the scheduled date and bucket, Vercel Cron invokes the bucket route.
6. **Catch-up:** Approved autopublish drafts up to 14 days overdue publish on
   the next **morning** bucket run (covers Sundays and missed crons). Manual
   **Run autopublish now** also publishes all due and overdue drafts.

## Vercel Cron Boundary

Vercel cron expressions are UTC. Hobby plans allow up to 100 cron jobs, but each
cron can only run once per day and timing precision is hourly. Pro and Enterprise
plans support once-per-minute schedules with per-minute precision.

To stay compatible with this boundary, `vercel.json` uses separate once-daily
cron entries for each schedule bucket. Each bucket has paired UTC entries so
America/New_York local-hour behavior works across EST and EDT. The route checks
the current local hour and skips if the invocation is not due.

Bucket routes:

- `/api/cron/ops-autopublish/morning`
- `/api/cron/ops-autopublish/midday`
- `/api/cron/ops-autopublish/afternoon`
- `/api/cron/ops-autopublish/evening`
- `/api/cron/ops-autopublish/late-evening`

Weekly X metrics readback:

- `/api/cron/ops-x-metrics`
- Reads only recent Ops-published X post ids.
- Stores aggregate performance snapshots.
- Does not poll timelines, search, mentions, DMs, or private data.

The legacy manual test endpoint remains:

- `POST /ops/api/autopublish/run`

## Environment

```env
OPS_AUTOPUBLISH_ENABLED=true
OPS_AUTOPUBLISH_TIMEZONE=America/New_York
CRON_SECRET=...
OPS_STORAGE_MODE=database
DATABASE_URL=...
OPS_SOCIAL_TOKEN_SECRET=...

# LinkedIn, when used
OPS_LINKEDIN_ENABLED=true

# X, when used
OPS_X_ENABLED=true
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=...
X_ACCOUNTS=[{"accountId":"account-founder-x","label":"Founder X"}]
```

## Still Forbidden

- Autopublish for Instagram or Facebook.
- Autopublish without per-draft opt-in.
- Autopublish for non-approved drafts.
- X direct-message scopes or DM access.
- Browser localStorage packages for cron jobs. Cron reads Postgres only.
- Raw social exports, credentials, private messages, PHI, or clinical payloads.

See `docs/ops-x-api-limits-and-scheduling.md` for X API cost/rate-limit posture
and platform scheduling windows.
