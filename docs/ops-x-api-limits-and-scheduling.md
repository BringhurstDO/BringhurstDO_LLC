# Ops X API Limits and Scheduling

This note records the current operating posture for X publishing from the Ops
page.

## Current X API facts

Primary sources checked on 2026-06-17:

- X API rate limits: `https://docs.x.com/x-api/fundamentals/rate-limits`
- X API usage and billing: `https://docs.x.com/x-api/fundamentals/post-cap`

Relevant details:

- X API v2 uses pay-per-usage pricing tracked at the app level.
- X billing is primarily tied to API consumption; X directs developers to the
  Developer Console for current endpoint pricing.
- Pay-per-usage plans have a monthly cap of 2 million Post reads unless using
  Enterprise.
- `POST /2/tweets` is documented at 10,000 requests per 24 hours per app and
  100 requests per 15 minutes per user.
- Usage and rate limits are separate: usage controls cost/credits; rate limits
  control request bursts and return 429 when exceeded.

## BringhurstDO operating posture

The Ops calendar should treat X as an approved manual publishing target for now:

- One operator-approved draft equals one `POST /2/tweets` write request.
- X metrics readback should run weekly only, during the Ops review cadence.
- Weekly readback should fetch only recent Ops-published post ids from the last
  7-14 days.
- Do not add automated X metrics, timelines, search, or usage polling without a
  separate cost review.
- Do not request or enable direct-message scopes. X read/write permission means
  post publishing plus weekly public post metric readback only.
- Store only metadata-only publish logs; never store tokens in browser props,
  exports, screenshots, or static content.

At expected posting volume, X write rate limits are not the constraint. Weekly
readback should stay in the low tens of Post reads per month. The main cost risk
is accidental read usage from timelines, search, mentions polling, or high-
frequency metrics collection. Keep broad X read features disabled until the
Developer Console budget and endpoint pricing are confirmed.

## Developer portal setup vs code work

Code can handle:

- Weekly readback cadence.
- Looking up only Ops-published post ids.
- Storing aggregate metrics in Ops records.
- Avoiding daily polling and broad read endpoints.
- Failing closed if direct-message scopes are ever added to the X scope list.
- Enforcing operator approval before each X write.

The X Developer Portal must handle:

- App permissions set to read and write, without direct-message access.
- OAuth 2.0 enabled with the exact callback URL.
- Scopes available to the app: `tweet.read`, `tweet.write`, `users.read`, and
  `offline.access`.
- Direct-message scopes such as `dm.read` or `dm.write` must remain disabled.
- Pricing/budget alerts and monthly spend cap.
- Plan access for any desired metrics fields/endpoints.

## Scheduler rules

- Generated schedules skip Sundays.
- Generated cadence is capped at 6 posts per week.
- Drafts store a calendar date plus a schedule bucket.
- The calendar displays platform-specific flexible publish windows.
- Operators can choose per-draft buckets for 09:00, 12:00, 15:00, 18:00, or
  21:00 America/New_York.
- X defaults to a midday flexible window: 12:00-13:30 America/New_York.
- X metrics readback cadence is weekly, not daily.
- LinkedIn and X autopublish are supported for approved, opted-in drafts.
- X autopublish still requires the same no-DM scopes and operator approval gates.

## Vercel cron boundary

Vercel cron schedules are UTC. To keep local America/New_York schedule buckets
working across daylight saving changes without hourly polling, `vercel.json`
uses paired once-daily UTC cron entries for each bucket:

- Morning: `/api/cron/ops-autopublish/morning`
- Midday: `/api/cron/ops-autopublish/midday`
- Afternoon: `/api/cron/ops-autopublish/afternoon`
- Evening: `/api/cron/ops-autopublish/evening`
- Late evening: `/api/cron/ops-autopublish/late-evening`

The bucket route checks the current local hour and skips if the invocation is
not due. This keeps each cron entry once daily, which is compatible with
Vercel's Hobby cron boundary, while Pro plans can execute with tighter timing.

Weekly X metrics readback runs through `/api/cron/ops-x-metrics`.
