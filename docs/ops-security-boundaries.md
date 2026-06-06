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
