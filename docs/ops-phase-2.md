# BringhurstDO Ops Phase 2

Phase 2 makes the private operator console useful as a local working dashboard.
It remains mock/local-only.

## What Exists Now

- `/ops` is the private overview dashboard.
- `/ops/content` is a local content workspace with idea bank, draft queue,
  manual posted tracking, and UTM helper links.
- `/ops/reports` is a mock weekly operator report.
- `/ops/projects` is a mock project health view for SyncSOAP, SyncSafety, and
  BringhurstDO.
- All phase 2 data is stored in local TypeScript mock data under `lib/ops`.
- UTM URLs are generated locally with no external tracking or posting API.

## What Is Still Mock/Local

- Content ideas.
- Draft post rows.
- Manual posted status.
- UTM campaign links.
- Weekly wins, risks, blockers, cost notes, marketing output, and next actions.
- Project health snapshots.
- Site status.
- Deploy status.
- Monthly cost estimates.
- Traction notes.

## Future Integration Candidates

Only add these after explicit approval and production protection review:

- Read-only SyncSOAP metadata summary export.
- Read-only SyncSafety project summary export.
- Aggregate AWS cost summaries.
- Read-only deployment status summaries.
- Approved public marketing metrics.
- Scheduled weekly report generation.
- Stronger auth, preferably Vercel Deployment Protection/SSO or a real auth
  provider with audit trails.

Do not add AI APIs, social APIs, AWS credentials, GA4, Meta, Vercel tokens,
Stripe, paid services, posting APIs, or autoposting in phase 2.

## Metadata-Only Boundary

BringhurstDO Ops is the aggregator. Source apps remain the systems of record.

SyncSOAP is HIPAA-sensitive and must export only metadata-only summaries if it
ever connects to BringhurstDO Ops. Do not move PHI, patient identifiers,
encounter IDs, transcripts, encounter text, clinical payloads, secret values,
cookies, tokens, raw logs, or raw evidence bundles into BringhurstDO.

## Manual Approval Boundary

Manual approval is required before:

- Social posting.
- Email sending.
- Publishing content.
- Spend.
- Deployments.
- External API writes.
- Account or configuration changes.
- Any mutation in a source system.

The current content workspace tracks posted status manually. It does not publish,
schedule, send, or mutate external systems.

## Data Model Guard

Phase 2 includes a shared `MetadataOnlyString` / `SafeOpsText` convention and a
local mock-data key validator. Future content and project health models should
continue to reject unsafe field names such as `patientName`, `encounterId`,
`transcript`, `secret`, `cookie`, `token`, and `rawLog`.

Current limitation: `assertNoForbiddenOpsKeys` guards unsafe field names, not
unsafe values. That is acceptable for local/mock phase 2 data. Before
user-entered content or live integrations are added, ops models need value
validation and review gates so unsafe text cannot enter drafts, reports,
campaign links, or project health snapshots.
