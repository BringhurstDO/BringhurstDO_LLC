# BringhurstDO Ops Phase 4A

Phase 4A makes the local content workflow usable for manual operations without
adding live integrations.

## What Is Local Now

- Content package exports download JSON in the browser.
- Content package imports use a browser file picker for exported `.json` files,
  then run metadata-only validation and basic package-shape checks.
- Duplicate package IDs are saved as imported copies with new linked IDs rather
  than replacing existing local packages.
- Copy Post Packet copies platform drafts, UTM links, posted state, public post
  URLs, and safety notes for manual review.
- Platform draft slots use deterministic templates only. LinkedIn, Instagram,
  and X produce distinct copy from the same metadata-only source update; no AI
  API is connected.
- Facebook draft targets remain disabled while their account status is
  `blocked_pending_meta_trust`.
- Weekly Content Queue groups local package drafts by ready, not posted, posted,
  and missing metrics.
- Account Registry stores mock public account planning rows for Kyle Bringhurst,
  BringhurstDO, SyncSOAP, and SyncSafety across LinkedIn, Instagram, Facebook,
  and X.
- Account Registry status labels are `active`, `planned`,
  `blocked_pending_meta_trust`, and `missing`.
- Facebook rows stay `blocked_pending_meta_trust` until Meta allows Page
  creation. They are not live publishing targets.

## Boundaries

- No OAuth.
- No social API.
- No AI API.
- No autoposting.
- No ad-spend mutation.
- No Meta Business integration.
- No database or server persistence.
- No live credentials.
- No SyncSOAP clinical payloads, PHI, patient identifiers, encounter IDs,
  transcripts, raw logs, cookies, tokens, or private messages.

## Manual Workflow

1. Enter one metadata-only source update at `/ops/content/new`.
2. Select product/account/platform publication targets.
3. Generate or manually create platform-specific draft slots.
4. Review deterministic platform copy for LinkedIn, Instagram, and X.
5. Save the package locally in the browser.
6. Export Package if a local JSON handoff or backup is needed.
7. Import Package by choosing a prior exported `.json` file when restoring or
   moving a package between local browser contexts.
8. Copy Post Packet for manual review and manual posting.
9. Copy the generated UTM link into the external platform manually.
10. Publish manually only after approval.
11. Mark posted/not posted manually.
12. Add public post URL and aggregate performance metrics manually.
13. Review the weekly content queue for ready rows and missing metrics.

## Future Requirements

Before any user-entered content leaves the browser or any live integration is
added, add stronger auth, audit trails, stricter value validation, review gates,
and server-only token handling. Future read-only social metrics must aggregate
public metrics only and must not render tokens, cookies, private messages,
audience exports, or raw provider responses.
