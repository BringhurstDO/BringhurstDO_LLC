# Phase 8B - Publish Calendar

Phase 8B adds an operator-facing calendar for reviewing saved single posts and
series splits. A single post can now be dated, assigned a time bucket, and opted
into supported autopublish directly from `/ops/content/new`; the calendar is the
overview and rescheduling surface rather than a required second creation step.

## Operator Flow

1. Draft a single post on `/ops/content/new`, choose destinations, and optionally
   set its publish date, time bucket, and autopublish approval before saving.
2. Open `/ops/content/calendar` when reviewing or changing the broader queue.
3. Review **Today**, **Overdue**, and upcoming date groups.
4. For each draft:
   - Approve when copy is ready.
   - Reschedule by editing the suggested date.
   - Choose a schedule bucket: 09:00, 12:00, 15:00, 18:00, or 21:00.
   - Toggle autopublish only for supported platforms after review.
   - Publish manually when needed from the calendar buttons.
5. Posted drafts can be shown via the **Show posted** filter.

## Calendar Timing States

| State | Meaning |
| --- | --- |
| `today` | `suggestedScheduledFor` matches today and not posted |
| `overdue` | Suggested date is in the past and not posted |
| `upcoming` | Suggested date is in the future |
| `unscheduled` | No `suggestedScheduledFor` on the draft |
| `posted` | Published post record exists |

## Platform Schedule Buckets

Drafts store a date plus `suggestedScheduleBucketId`. If an older draft does not
have a bucket, the platform default is used.

| Bucket | Local window |
| --- | --- |
| Morning | 09:00-10:30 America/New_York |
| Midday | 12:00-13:30 America/New_York |
| Afternoon | 15:00-16:30 America/New_York |
| Evening | 18:00-19:30 America/New_York |
| Late evening | 21:00-22:00 America/New_York |

Generated schedules skip Sundays and cap cadence at 6 posts per week.

## Data Source

- Reads the same persisted content packages as `/ops/content/new`.
- Uses `suggestedScheduledFor`, `suggestedScheduleBucketId`, `seriesIndex`, and
  draft/post status from saved packages.
- No separate calendar table exists.

## Publishing Integrations

- LinkedIn and X can publish approved drafts through Ops APIs.
- X read/write access excludes direct-message scopes.
- X weekly metrics readback reads only recent Ops-published post ids.

## Safety / Boundaries

- Approval is mandatory before manual publish or autopublish.
- Rescheduling only updates draft metadata.
- Autopublish requires per-draft opt-in.
- Same metadata-only and publishable-copy rules as Phase 7A and 8A.

See `docs/ops-phase-8c-scheduled-autopublish.md` for cron details.
