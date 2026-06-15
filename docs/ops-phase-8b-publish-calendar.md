# Phase 8B — Publish Calendar (Manual Publish)

Phase 8B adds a calendar-first view of saved content packages and series splits.
Suggested dates from Phase 8A become an operator-facing publish queue. **Nothing
autoposts** — each draft still requires explicit approval and a manual publish
click (LinkedIn) or manual posted tracking (other platforms).

## Operator flow

1. Open `/ops/content/calendar` (linked from Content Planning).
2. Review **Today**, **Overdue**, and upcoming date groups.
3. For each draft:
   - **Approve** when copy is ready
   - **Reschedule** by editing the suggested date
   - **Publish to LinkedIn** when the account is connected and the draft is approved
   - Open **New Content Package** for full editing, metrics, and reshare
4. Posted drafts can be shown via the “Show posted” filter.

## Calendar timing states

| State | Meaning |
|-------|---------|
| `today` | `suggestedScheduledFor` matches today and not posted |
| `overdue` | Suggested date is in the past and not posted |
| `upcoming` | Suggested date is in the future |
| `unscheduled` | No `suggestedScheduledFor` on the draft |
| `posted` | Published post record exists |

## Platform schedule buckets

The calendar can show default planning windows by platform, but these are
guidance only. They are not saved as per-draft scheduled times and do not change
Phase 8C cron behavior.

Current bucket defaults:

| Platform | Default bucket |
|----------|----------------|
| LinkedIn | Morning, 09:00 America/New_York |
| X | Morning, 09:00 America/New_York |
| Instagram | Evening, 18:00 America/New_York |
| Facebook | Evening, 18:00 America/New_York |

Future manual overrides should be limited to configured cron buckets, such as
09:00, 12:00, 15:00, 18:00, and 21:00 local time, rather than arbitrary minute
precision.

## Data source

- Reads the same persisted content packages as `/ops/content/new` (localStorage or
  Ops Postgres via `/ops/api/persistence/packages`).
- Uses `suggestedScheduledFor`, `seriesIndex`, and draft/post status from saved
  packages — no separate calendar table.

## LinkedIn integration

- Reuses Phase 7A publish API (`POST /ops/api/social/linkedin/publish`).
- Requires draft status `approved`, connected account, and operator confirm dialog.
- Successful publishes update `publishedPosts` and mark the draft `posted`.

## Safety / boundaries

- No background jobs, cron, or scheduled API calls.
- Rescheduling only updates metadata on the draft row.
- Same metadata-only and publishable-copy rules as Phase 7A and 8A.

## Out of scope (Phase 8C+)

Scheduled autopublish is implemented in Phase 8C for LinkedIn only. Still out of scope:

- Instagram, Facebook, or X autopublish
- Bulk approve without per-draft review
- Email/push reminders

See `docs/ops-roadmap.md` for the full phased plan and Codex handoff notes.
