# BringhurstDO Ops Content Package Workflow

This workflow turns one metadata-only source update into a local content package.
It does not use AI APIs, posting APIs, social APIs, databases, live credentials,
or paid services.

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

## Manual Workflow

1. Open `/ops/content/new`.
2. Enter one source update using metadata-only text.
3. Select products, accounts, and platforms.
4. Generate deterministic platform draft slots or create blank slots manually.
5. Review and edit each draft manually.
6. Save locally after validation.
7. Copy the generated UTM link into the external platform.
8. Post manually only after approval.
9. Mark posted/not posted manually.
10. Store the public post URL and aggregate performance metrics manually.

## Boundaries

- No AI generation is connected.
- No autoposting is connected.
- No posting API is connected.
- No ad-spend mutation is connected.
- No source-system mutation is connected.
- Manual approval is required before posting, publishing, spend, deployment, or
  any external write.

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
