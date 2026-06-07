# BringhurstDO Ops Security Boundaries

BringhurstDO Ops is the private aggregator for metadata-only operational summaries.
SyncSOAP remains the HIPAA-sensitive clinical application and must not become the
cross-business dashboard.

## Phase 1 Boundary

- `/ops` is protected by fail-closed Basic Auth middleware.
- If `OPS_BASIC_AUTH_USERNAME` or `OPS_BASIC_AUTH_PASSWORD_SHA256` is missing,
  `/ops` returns `401` and renders no page content.
- Phase 1 uses mock data only.
- Do not connect SyncSOAP, AWS, Vercel, GA4, Meta, AI APIs, or social posting
  APIs until explicitly approved.

## Data That May Enter BringhurstDO Ops

- Site health summaries.
- Deployment status summaries.
- AWS cost summaries.
- AI usage and cost totals.
- Aggregate user or invite counts.
- Compliance evidence status summaries.
- Content calendar and draft queue metadata.
- Public marketing metrics, if approved later.

## Data That Must Not Enter BringhurstDO Ops

- PHI.
- Patient identifiers.
- Encounter IDs.
- Encounter text.
- Transcripts.
- Clinical payloads.
- Secret values.
- Cookies or tokens.
- Raw application logs.
- Raw evidence bundles containing sensitive details.

## Future Auth Requirement

Basic Auth is temporary and acceptable only for this read-only mock phase. Before
adding mutation features, live integrations, report generation, or social posting,
replace or front it with stronger protection, preferably Vercel Deployment
Protection/SSO or a real auth provider with role checks and audit trails.

## Content Posting Rule

The content calendar may hold ideas and drafts. No system in BringhurstDO Ops may
post to social channels without explicit manual approval.

## Phase 2 Local/Mock Data Model Prep

Phase 2 remains local/mock-only. Do not connect AI APIs, social APIs, AWS
credentials, GA4, Meta, Vercel tokens, or live project integrations until
explicitly approved.

### Global Source Boundary

- BringhurstDO Ops may aggregate metadata-only summaries.
- SyncSOAP remains the HIPAA-sensitive source application.
- SyncSOAP data entering BringhurstDO Ops must be aggregate, metadata-only, and
  scrubbed of clinical payloads before export.
- Source apps keep ownership of sensitive operational and clinical data.
- No model may store raw source payloads, raw logs, secret values, cookies, or
  tokens.

### Global Manual Approval Rules

- Manual approval is required before any social posting.
- Manual approval is required before any spend, mutation, deployment, external
  API write, content publication, or account/configuration change.
- Draft generation may be local/mock-only until a stronger auth and approval
  workflow exists.

### Future Type-Safety Requirement

When phase 2 types are implemented, create a shared `SafeOpsText` or
`MetadataOnlyString` convention or validation helper. Content models must not
casually grow fields named `patientName`, `encounterId`, `transcript`, `secret`,
`cookie`, `token`, `rawLog`, or similar sensitive names.

### Content Ideas

Allowed fields:

- `id`
- `projectId`
- `title`
- `angle`
- `audience`
- `sourceType`
- `sourceNotes`
- `riskLevel`
- `status`
- `createdAt`
- `reviewNotes`

Forbidden fields:

- PHI.
- Patient identifiers.
- Patient stories sourced from clinical work.
- Encounter IDs.
- Encounter text.
- Transcripts.
- Secret values.
- Cookies or tokens.
- Raw logs.

Source boundary: content ideas may reference public positioning, manual notes,
and metadata-only project summaries. SyncSOAP ideas must not reference clinical
payloads or patient examples.

### Draft Posts

Allowed fields:

- `id`
- `ideaId`
- `projectId`
- `channel`
- `bodyMarkdown`
- `status`
- `approvalRequired`
- `approvedBy`
- `approvedAt`
- `publishWindow`
- `utmCampaignId`
- `safetyChecklist`

Forbidden fields:

- PHI.
- Patient identifiers.
- Encounter IDs.
- Encounter text.
- Transcripts.
- Secret values.
- Cookies or tokens.
- Raw logs.
- Auto-post credentials or API payloads.

Source boundary: draft posts may use approved content ideas and manual copy.
SyncSOAP drafts must stay marketing-safe and metadata-only.

Manual approval requirement: no draft post may be published, scheduled, or sent
to an external API without explicit manual approval.

### Weekly Operator Reports

Allowed fields:

- `id`
- `weekStart`
- `weekEnd`
- `generatedAt`
- `mode`
- `summary`
- `projectHighlights`
- `risks`
- `costSummary`
- `contentSummary`
- `nextActions`

Forbidden fields:

- PHI.
- Patient identifiers.
- Encounter IDs.
- Encounter text.
- Transcripts.
- Secret values.
- Cookies or tokens.
- Raw logs.
- Raw evidence bundles.
- Raw billing exports.

Source boundary: weekly reports may summarize approved project health snapshots,
approved content queue metadata, and aggregate cost/usage summaries only.

Manual approval requirement: no report action may trigger spend, mutation,
posting, deployment, or external writes without explicit manual approval.

### Project Health Snapshots

Allowed fields:

- `id`
- `projectId`
- `capturedAt`
- `source`
- `siteStatus`
- `deployStatus`
- `costSummary`
- `userCounts`
- `complianceStatus`
- `integrationStatus`
- `notes`

Forbidden fields:

- PHI.
- Patient identifiers.
- Encounter IDs.
- Encounter text.
- Transcripts.
- Secret values.
- Cookies or tokens.
- Raw logs.
- Full deployment payloads containing secrets.
- Raw compliance evidence files.

Source boundary: snapshots may record metadata-only health and status. SyncSOAP
snapshots must not include clinical data, transcript text, patient identifiers,
or encounter-level details.

Manual approval requirement: snapshots are read-only records. Any follow-up
mutation, spend, deploy, or external system change requires explicit manual
approval.

## Phase 3 Manual Metrics And Accounts

Phase 3 remains local/mock-only and manual-first. Do not connect posting APIs,
ad-spend mutation, AI APIs, social APIs, AWS, GA4, Meta, Vercel, Stripe,
databases, paid services, or live credentials.

### Weekly Scorecard Metrics

Allowed fields:

- `id`
- `projectId`
- `metricId`
- `label`
- `value`
- `unit`
- `weekStart`
- `weekEnd`
- `source`
- `enteredAt`
- `notes`

Forbidden fields:

- Names, emails, phone numbers, or direct contact details.
- Private message bodies.
- Audience exports.
- Cookies or tokens.
- Platform credentials.
- Raw analytics rows.
- Raw logs.
- Ad account secrets or mutation payloads.

Source boundary: scorecard metrics may contain aggregate manual totals for
posts, followers, website clicks, leads, conversations, spend, and revenue.

Manual approval requirement: spend and revenue rows are records only. No row may
change budget, create spend, publish content, or mutate an external system.

### Account Registry

Allowed fields:

- `id`
- `projectId`
- `name`
- `kind`
- `platform`
- `handle`
- `profileUrl`
- `role`
- `status`
- `notes`
- `accountType`
- `publicHandle`
- `purpose`
- `sourceBoundary`
- `manualReviewCadence`
- `allowedMetrics`
- `forbiddenData`
- `integrationPlaceholder`

Forbidden fields:

- Passwords.
- API keys.
- Cookies or tokens.
- Login state.
- Private messages.
- Contact details.
- Audience exports.
- Ad account secrets.
- Platform configuration secrets.

Source boundary: registry rows describe public account context and future
read-only aggregate metrics only. They are not a credential store.

Phase 4A requires mock registry coverage for Kyle Bringhurst, BringhurstDO,
SyncSOAP, and SyncSafety across LinkedIn, Instagram, Facebook, and X. Profile
URLs are planning metadata only and must be verified manually before public use.
Supported status labels are `active`, `planned`,
`blocked_pending_meta_trust`, and `missing`. Facebook rows must stay
`blocked_pending_meta_trust` until Meta trust/Page creation is available.

### Social Metric Placeholders

Meta/Instagram, LinkedIn, and X placeholders may describe future read-only
aggregate metrics only. Future integration tokens must remain server-only and
must never render in browser props, downloaded exports, screenshots, logs, or
static pages.

## Content Package Workflow Boundary

`/ops/content/new` is a local/manual workflow for turning one metadata-only
source update into platform-specific draft slots. It may save to browser local
storage after validation, but it must not write to a server database, call AI,
post externally, mutate ad spend, or change a source system.

Allowed models:

- `SourceUpdate`
- `ContentPackage`
- `PublicationTarget`
- `PlatformDraft`
- `PublishedPost`
- `PerformanceSnapshot`
- `BusinessOutcome`

Allowed data:

- Metadata-only business or product update summaries.
- Public publication target context.
- Draft copy that has been manually reviewed.
- Generated UTM URLs for public destinations.
- Manual posted/not-posted state.
- Public post URLs.
- Aggregate manual performance metrics.
- Aggregate manual business outcomes.

Forbidden data:

- PHI.
- Patient identifiers.
- Encounter IDs.
- Encounter text.
- Transcripts.
- Clinical payloads.
- Private messages.
- Contact details.
- Cookies or tokens.
- Secret values.
- Raw logs.
- Platform credentials.
- Audience exports.

SyncSOAP source updates must stay at the product/business metadata level. They
must not contain clinical examples, encounter-level details, transcripts, or
patient stories.

## Phase 4A Package Import, Export, Copy Packet, And Weekly Queue

Phase 4A remains local/browser-only and mock/manual-first. Do not add OAuth,
social APIs, AI APIs, autoposting, databases, live credentials, or external
mutation. Do not add Meta Business integration while Facebook rows are blocked
pending Meta trust.

Allowed operations:

- Export one local `ContentPackage` record as JSON.
- Import one local `.json` package export or a small local export array from the
  browser file picker after metadata-only validation and package-shape checks.
- Create an imported copy with new linked IDs when an imported package ID
  already exists; do not silently replace local packages.
- Copy a post packet containing platform draft text, UTM links, posted state,
  public post URLs, and safety notes for manual review.
- Show a weekly content queue derived from local saved package records.
- Track manual posted/not-posted state and aggregate manual performance metrics.

Forbidden operations:

- Posting, scheduling, or editing social posts through an API.
- OAuth login or token capture.
- Ad-spend mutation or budget control.
- Database writes or server persistence.
- Raw platform exports, raw logs, private messages, contact details, cookies,
  tokens, credentials, or source-system payloads.

Source boundary: exported and imported packages may contain only metadata-only
business/product/operator updates and manually reviewed draft copy. SyncSOAP
package data must remain product/business metadata only and must not include PHI,
patient identifiers, encounter IDs, transcripts, clinical payloads, or clinical
examples.

Manual approval requirement: copy packets, UTM links, package imports, and
weekly queue rows do not grant publishing approval. Every post and every spend
or mutation remains manual-approval-required.

### UTM Campaign Links

Allowed fields:

- `id`
- `projectId`
- `campaign`
- `source`
- `medium`
- `content`
- `term`
- `destinationUrl`
- `generatedUrl`
- `createdAt`
- `status`

Forbidden fields:

- PHI.
- Patient identifiers.
- Encounter IDs.
- Encounter text.
- Transcripts.
- Secret values.
- Cookies or tokens.
- Raw logs.
- Private redirect credentials.

Source boundary: UTM links may point to public marketing pages or approved
destination URLs only. SyncSOAP campaign links must not encode clinical details
or private user information.

Manual approval requirement: link generation is local/mock-only until approved.
Publishing, scheduling, paid promotion, or campaign spend requires explicit
manual approval.
