# BringhurstDO Ops Manual Workflow

This workflow is local/manual only. It does not use AI APIs, social APIs, AWS,
GA4, Meta, Vercel tokens, Stripe, databases, paid services, or posting APIs.

Status note: this document preserves the original manual workflow. Later
approved exceptions add Postgres persistence, AI draft improvement/series split,
LinkedIn publish/reshare, the publish calendar, and LinkedIn-only autopublish.
Use `docs/ops-roadmap.md` and `docs/ops-security-boundaries.md` as the current
source of truth for approved exceptions.

## Boundaries

- `/ops/*` must stay protected.
- BringhurstDO Ops stores and renders metadata-only operating summaries.
- SyncSOAP remains the HIPAA-sensitive source app. Do not move PHI, patient
  identifiers, encounter IDs, transcripts, encounter text, clinical payloads,
  raw logs, secret values, cookies, or tokens into BringhurstDO Ops.
- Manual approval is required before posting, publishing, spend, deployments,
  source-system writes, or any external mutation.
- Future integration tokens must stay server-only and must never render in
  browser props, static exports, screenshots, logs, or downloaded files.

## Content Drafts

1. Open `/ops/content`.
2. Review the draft queue and safety notes.
3. Export draft rows as JSON or Markdown for review. Use CSV only for simple
   spreadsheet review.
4. Approve copy manually outside the dashboard.
5. Post manually in the target platform. No publishing API is connected.
6. Mark posted manually by updating the local/mock row status to `posted` and
   adding `postedManuallyAt`. Until storage is approved, this is a code/mock-data
   update or a local JSON import preview only.

## Source Update To Content Package

1. Open `/ops/content/new`.
2. Enter one metadata-only source update.
3. Select the products, accounts, and platforms that should receive draft slots.
4. Generate deterministic platform draft slots or add blank slots manually.
5. Review each draft slot manually. The generator is not AI and does not call an
   external model.
6. Save the content package locally after validation.
7. Post manually only after approval.
8. Add the public post URL and aggregate performance metrics manually.

Do not paste SyncSOAP clinical payloads, PHI, patient examples, transcripts,
private messages, contact details, credentials, cookies, tokens, or raw logs into
source updates, draft bodies, post URLs, performance snapshots, or business
outcomes.

## UTM Links

1. Open `/ops/content`.
2. Review the UTM Campaign Helper.
3. Confirm every draft has a generated campaign link before posting.
4. Copy the generated public destination URL for the approved draft.
5. Paste the UTM link manually into the external post, email, or page.
6. Export UTM links as JSON, Markdown, or CSV for manual records.

UTM links do not track anything by themselves. Any future analytics source must
be approved separately and must expose only aggregate marketing metrics.

## Weekly Scorecard

1. Open `/ops/metrics`.
2. Review cards for posts, followers, website clicks, leads, conversations,
   spend, and revenue.
3. Enter aggregate manual values in the local metric entry panel.
4. Copy the validated JSON row into a local import file or mock data after
   review.
5. Use `/ops/import` to validate manual metric entry JSON before previewing it.

Do not store names, emails, message text, private conversations, ad account
configuration, cookies, tokens, raw logs, or row-level analytics.

## Account Registry

1. Open `/ops/accounts`.
2. Review SyncSOAP, SyncSafety, BringhurstDO, and founder account rows.
3. Track only public account context, purpose, status, allowed aggregate metric
   categories, and future read-only placeholder notes.
4. Do not add credentials, cookies, tokens, login state, private messages,
   audience exports, contact details, ad account secrets, or platform
   configuration secrets.

Meta/Instagram, LinkedIn, and X are placeholder sources only. Future integrations
must be read-only first and require explicit approval.

## Weekly Report

1. Open `/ops/reports`.
2. Review project status cards, wins, risks, cost notes, marketing output, and
   next actions.
3. Export the report as JSON for structured archive or Markdown for human
   review.
4. Copy the Markdown into a private weekly note if needed.
5. Do not email, publish, or summarize with AI until that workflow is explicitly
   approved.

## Project Health Snapshots

1. Open `/ops/projects`.
2. Review mock site status, deploy status, cost estimate, traction notes, and
   next action.
3. Export snapshots as JSON or Markdown for manual weekly review.
4. Replace mock values only with approved metadata-only summaries.

## Paste / Import Preview

1. Open `/ops/import`.
2. Select the dataset type.
3. Paste JSON from a local export or manually prepared metadata-only file.
4. The browser validates unsafe keys, obvious unsafe values, and expected shape
   before rendering a preview.
5. If validation fails, do not work around the warning by renaming sensitive
   data. Remove the sensitive data at the source.

The import page does not save data, mutate mock data, call APIs, or write to a
database. It is only a preview and validation tool for manual workflows.
