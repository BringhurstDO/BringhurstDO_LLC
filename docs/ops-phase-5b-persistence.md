# BringhurstDO Ops Phase 5B Persistence Plan

Phase 5B prepares the private Ops console for durable storage without turning on
any database, paid service, external credential, AI API, OAuth flow, social API,
posting API, or autoposting.

## Current State

- Storage mode is `local-browser`.
- Content package records continue to save under the existing localStorage key:
  `bringhurstdo.ops.contentPackages.v1`.
- Export Package and Import Package remain the backup and handoff mechanism.
- The localStorage adapter now implements the same persistence interface a
  future server/database adapter should implement.
- The UI shows `Storage mode: local browser` so the operator sees the current
  durability limit before relying on saved packages.

## Adapter Boundary

The persistence interface is intentionally narrow:

- `loadContentPackages()`
- `saveContentPackages(records)`

Future adapters should add server-only implementations behind protected API
routes or server actions. They must not expose database URLs, service keys,
cookies, OAuth tokens, social tokens, AI provider keys, or raw source-system
payloads to the browser.

The current local adapter stores the same metadata-only package JSON that export
and import already use. This keeps the migration path simple: a local browser
export can become the import seed for a future database migration.

## Server/Database-Ready Types

Phase 5B adds typed record shapes for future server persistence:

- Source updates.
- Content packages.
- Platform drafts.
- Published posts.
- Performance snapshots.
- Business outcomes.
- Media metadata.
- Account registry rows.
- Brand rules.
- AI prompt history.

These are type-only planning shapes. They do not create tables, connect a
database, add credentials, or change the runtime storage mode.

## Metadata-Only Boundary

All future database writes must preserve the current Ops boundary:

- SyncSOAP records must remain product/business metadata only.
- Do not store PHI, patient identifiers, encounter IDs, encounter text,
  transcripts, clinical payloads, patient images, private messages, contact
  lists, raw logs, cookies, tokens, OAuth data, credentials, or secret values.
- Manual approval remains required before posting, spending, or any external
  mutation.
- AI prompt history, if persisted later, must store only reviewed prompt text
  that has passed metadata-only validation.

## Recommended Database Options

Pricing and free-tier details can change, so verify the provider pages again
before provisioning anything.

### Vercel Marketplace Postgres / Neon

Best fit for BringhurstDO Ops when deploying on Vercel.

Pros:

- Vercel's docs say new Postgres projects should use a Marketplace Postgres
  integration, and existing Vercel Postgres databases were moved to Neon in
  December 2024.
- Good operational fit for a small Vercel-hosted Next.js app.
- Neon free tier is useful for development and small intermittent workloads.
- Neon supports scale-to-zero, which helps keep manual ops tooling cheap.

Cons and cost risks:

- Free-tier storage and compute quotas are limited.
- Paid usage is metered; a future always-on workflow, broad reporting queries,
  or many preview branches can create surprise costs.
- Production reliability may require moving off the free tier.

Use when:

- Ops remains a small private dashboard.
- We want the lowest-friction path from Vercel to Postgres.
- We can enforce server-only credentials and metadata-only writes.

### Direct Neon

Best fit if we want direct provider control while still keeping Vercel hosting.

Pros:

- Same likely database engine path as Vercel Marketplace Postgres.
- Direct console access to branching, scale-to-zero, usage, and cost controls.
- Can start free for development if the data volume stays tiny.

Cons and cost risks:

- Another provider account and billing surface.
- Paid tiers meter compute and storage from zero after upgrade.
- Branch/history settings need active cleanup to avoid avoidable spend.

Use when:

- We want explicit Neon account control instead of installing through Vercel.

### Supabase Postgres

Best fit if Ops later needs a broader app backend, not just Postgres.

Pros:

- Managed Postgres plus optional auth, storage, realtime, and edge functions.
- Free plan can be enough for prototypes.
- Documentation clearly describes quotas and overage categories.

Cons and cost risks:

- More product surface than Ops needs right now.
- Paid plans include fixed subscription cost plus possible usage fees.
- Extra services create more places to accidentally store data outside the
  metadata-only boundary.

Use when:

- We intentionally want Supabase features beyond a simple server-side Postgres
  adapter.

## Suggested Migration Plan

1. Keep using localStorage and JSON exports until durable storage is approved.
2. Export all local packages from `/ops/content/new`.
3. Validate each export with existing import validation and metadata-only checks.
4. Create database tables matching the server/database-ready record types.
5. Build a server-only database adapter implementing the same persistence
   interface.
6. Add an authenticated migration route or script that imports exported JSON and
   writes normalized records.
7. Run migration in preview with test exports first.
8. Verify `/ops/*` still fails closed when auth env vars are missing.
9. Switch storage mode from `local-browser` to a clearly labeled database mode
   only after production env vars and deployment protection are verified.
10. Keep export/import available as a backup even after database persistence
    exists.

## Future Requirements Before Database Writes

- Add value validation/review gates before accepting user-entered or imported
  live data.
- Keep database credentials server-only.
- Add row-level ownership or single-operator access controls before multi-user
  use.
- Add backup/export job before deleting localStorage as a supported workflow.
- Add audit fields for manual actions without storing raw request logs.
- Do not connect paid database services until explicitly approved.

## References Checked

- Vercel Postgres docs: https://vercel.com/docs/postgres
- Neon pricing: https://neon.com/pricing
- Supabase billing docs: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase compute and disk docs: https://supabase.com/docs/guides/platform/compute-and-disk
