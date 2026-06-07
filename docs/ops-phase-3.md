# BringhurstDO Ops Phase 3

Phase 3 prioritizes content operations before analytics. It makes the private
ops console useful for turning source updates into local content packages while
keeping scorecards and social metrics manual/mock-only.

It does not connect live APIs or create mutation capabilities.

## What Exists Now

- `/ops/metrics` shows weekly scorecard cards for posts, followers, website
  clicks, leads, conversations, spend, and revenue.
- `/ops/metrics` includes a browser-local manual metric entry preview. It
  validates metadata-only text but does not save data.
- `/ops/import` accepts manual metric entry JSON for local validation and
  preview.
- `/ops/accounts` shows a manual registry for SyncSOAP, SyncSafety,
  BringhurstDO, and founder accounts.
- `/ops/content` now shows UTM discipline: every draft row should have a
  generated campaign link before posting.
- `/ops/content/new` creates a local source-update-to-content-package workflow.
- Content package models cover `SourceUpdate`, `ContentPackage`,
  `PublicationTarget`, `PlatformDraft`, `PublishedPost`, `PerformanceSnapshot`,
  and `BusinessOutcome`.
- Social metrics for Meta/Instagram, LinkedIn, and X are placeholders only.

## Still Manual / Mock

- Scorecard values.
- Manual metric entry rows.
- Follower counts.
- Website click totals.
- Lead counts.
- Conversation counts.
- Spend and revenue totals.
- Account registry rows.
- Social metric placeholders.
- Source updates.
- Content packages.
- Platform-specific draft slots.
- Published post URLs and posted/not-posted state.
- Manual performance snapshots.
- Manual business outcomes.

## UTM Discipline

Every post should point to a generated UTM campaign link before manual posting.
The UTM link can be copied from `/ops/content` and pasted manually into the
external platform. The dashboard does not publish, schedule, or track the post.

## Account Registry Boundary

The account registry is not a credential store. It may contain public account
context, purpose, review cadence, allowed metric categories, and future
read-only integration notes.

Do not store credentials, private messages, cookies, tokens, login state,
audience exports, contact details, raw logs, ad account secrets, or platform
configuration secrets.

## Future Social Metrics

Future Meta/Instagram, LinkedIn, or X integrations must be read-only first and
must return aggregate metrics only. Tokens must stay server-only and must never
render into browser props, downloaded exports, screenshots, or logs.

## Approval Boundary

Manual approval is still required before:

- Publishing or sending content.
- Connecting posting APIs.
- Creating, changing, or increasing spend.
- Adding ad platform mutation.
- Pulling live social, analytics, billing, or CRM data.
- Storing user-entered content beyond local/mock preview.

No posting APIs, ad-spend mutation, AI APIs, social APIs, AWS, GA4, Meta,
Vercel, Stripe, database, or paid service integrations are part of Phase 3.

See `docs/ops-content-package-workflow.md` for the manual source-update workflow.
