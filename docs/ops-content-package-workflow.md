# BringhurstDO Ops Content Package Workflow

This workflow turns one metadata-only source update into a local content package.
It does not use AI APIs, posting APIs, social APIs, databases, live credentials,
or paid services.

Status note: this document describes the original manual package workflow.
Later approved exceptions add Postgres persistence, AI draft improvement/series
split, LinkedIn publish/reshare, the publish calendar, and LinkedIn-only
autopublish. Use `docs/ops-roadmap.md` as the current source of truth when this
manual workflow appears to conflict with a later phase doc.

For the full phased plan (including series split, publish calendar, and LinkedIn),
see **`docs/ops-roadmap.md`**.

## Related workflows

| Workflow | Doc | Route |
|----------|-----|-------|
| Series split (8A) | `ops-phase-8a-content-series.md` | `/ops/content/series` |
| Publish calendar (8B) | `ops-phase-8b-publish-calendar.md` | `/ops/content/calendar` |
| LinkedIn publish (7A) | `ops-phase-7a-linkedin-publish.md` | `/ops/accounts`, builder |

## Models

- `SourceUpdate`: one approved business/product/operator update.
- `ContentPackage`: the local planning container for one source update.
- `PublicationTarget`: a manual destination such as a project account, founder
  account, blog, or email channel.
- `PlatformDraft`: a platform-specific draft slot with a generated UTM URL.
- `PublishedPost`: manual posted/not-posted tracking plus the public post URL
  after manual posting.
- `PerformanceSnapshot`: manually entered aggregate performance metrics.
- `BusinessOutcome`: manually entered aggregate leads, conversations, and
  revenue tied to the package.

New package exports distinguish source scope from publishing scope:

- `sourceProjectId`: the project/product the source update is about.
- `publishingProjectId`: the brand/account project doing the manual posting.
- `sourceDate`: the user-selected content/planning date, which may be future.
- `capturedAt`: the actual current date when metrics or outcomes are recorded.
- `numericMetrics` and `numericOutcomes`: numeric mirrors coerced from flexible
  manual text inputs for future analytics.

## Manual Workflow

1. Open `/ops/content/new`.
2. Enter one source update using metadata-only text.
3. Select products, accounts, and platforms.
4. Generate deterministic platform draft slots or create blank slots manually.
5. Review and edit each draft manually.
6. Save locally after validation.
7. Export Package when you want a local JSON handoff or backup.
8. Import Package by selecting a prior local JSON export from the file picker.
   The file must pass metadata-only validation and package-shape checks.
9. Copy Post Packet to copy all platform drafts, UTM links, approval reminder,
   and posted state into a clean manual handoff.
10. Copy the generated UTM link into the external platform.
11. Post manually only after approval.
12. Mark posted/not posted manually.
13. Store the public post URL and aggregate performance metrics manually.
14. Review the Weekly Content Queue for ready, not posted, posted, and missing
   metrics rows.

## Boundaries

- No AI generation is connected.
- No autoposting is connected.
- No posting API is connected.
- No ad-spend mutation is connected.
- No source-system mutation is connected.
- Package export, package import, copy packet, and weekly queue views are local
  browser/manual workflow helpers only.
- Manual approval is required before posting, publishing, spend, deployment, or
  any external write.

## Phase 4A Manual Package Tools

- `Export Package` downloads one local content package record as JSON.
- `Import Package` opens a local `.json` file picker, accepts a single content
  package export or a small array of exports, rejects unsafe metadata keys or
  obvious unsafe values, and saves only to the current browser.
- If an imported package ID already exists, the import creates an imported copy
  with new linked IDs instead of replacing the existing package.
- `Copy Post Packet` copies all platform draft slots, draft bodies, generated
  UTM URLs, posted state, public post URLs, and safety notes for manual review.
- Generated slots use deterministic platform templates only. Bodies are
  **link-free** — destination/UTM URLs stay on the draft record (`generatedUrl`)
  for operator reference and post packets, not in publishable copy. Hashtags are
  allowed sparingly (Instagram may include a single product tag); do not pad
  posts with hashtag stacks. X stays within platform length limits without
  truncating for a URL.
- `sanitizePublishableBody` strips public URLs and template/operator artifacts
  on create, AI improve, calendar display, and publish. LinkedIn (and Ops policy
  for all platforms) rejects publishing bodies that still contain URLs.
- Older exported packages are migrated on import to add explicit source and
  publishing project fields, numeric metric mirrors, and corrected capture
  dates where older exports used the source date.
- Older generated draft bodies are regenerated only when they match known
  deterministic-template fingerprints (including legacy bodies that still embed
  URLs). Drafts that appear manually edited are preserved with a migration note
  instead of being overwritten silently.
- `Repair Generated Drafts` can be run manually on a saved package to re-apply
  the current deterministic templates to recognized generated draft bodies.
- The weekly queue is derived from saved local package records and groups drafts
  into ready, not posted, posted, and missing metrics.
- Every platform draft slot keeps a generated UTM URL for operator tracking /
  post packets — not for pasting into the social body.
- Facebook targets remain disabled unless their account status is `active`.
  Active Facebook draft slots are manual-only and still require approval before
  posting.

Package tools must never become a credential path. Do not import or paste OAuth
responses, cookies, tokens, raw social exports, raw logs, private messages,
contact details, or SyncSOAP clinical payloads into package imports or draft
bodies.

## Forbidden Data

Do not paste or store:

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

SyncSOAP source updates must remain product/business metadata only. They must
not include clinical examples, transcripts, patient stories, or encounter-level
details.

## Future Requirements

Before server-side persistence, user-entered content, AI-assisted drafting, live
metrics, or posting integrations, add stronger auth, audit trails, value
validation, review gates, and explicit approval controls. Future integration
tokens must stay server-only and must never render into browser props, exports,
screenshots, logs, or static pages.
