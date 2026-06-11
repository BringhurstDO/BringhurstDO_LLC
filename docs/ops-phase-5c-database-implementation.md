# BringhurstDO Ops Phase 5C Durable Database Persistence

Phase 5C adds a Postgres persistence path behind the existing
`OpsPersistenceAdapter` while preserving the localStorage fallback and
export/import workflow.

## Implemented Pieces

- `lib/ops/persistence.ts`
  - Keeps `createLocalStorageOpsPersistenceAdapter`.
  - Adds `createRemoteOpsPersistenceAdapter`, which calls protected Ops
    persistence routes when database mode is active.
- `lib/ops/persistence-db.ts`
  - Server-only Postgres adapter using `@neondatabase/serverless`.
  - Implements `loadContentPackages()` and `saveContentPackages()`.
  - Upserts metadata-only JSONB records and recomposes content package records
    on load.
- `lib/ops/persistence-validation.ts`
  - Server-side metadata-only and shape validation before any database write.
- `app/ops/api/persistence/packages/route.ts`
  - Protected by existing `/ops/:path*` Basic Auth middleware.
  - `GET` loads records from Postgres.
  - `PUT` validates and saves records to Postgres.
- `app/ops/api/persistence/migrate/route.ts`
  - Protected migration/import endpoint for exported package JSON.
  - Accepts one exported package, an array of exported packages, or
    `{ "contentPackages": [...] }`.
- `db/migrations/0001_ops_persistence.sql`
  - Creates Postgres tables for source updates, content packages, platform
    drafts, published posts, performance snapshots, business outcomes, media
    metadata, account registry snapshots, brand rules, audience profiles, and AI
    prompt history metadata.
- `/ops/content/new`
  - Displays `Storage mode: local browser` or `Storage mode: durable database`.
  - Uses localStorage unless the server reports database mode.

## Runtime Selection

Database mode activates only when both are true:

- `OPS_STORAGE_MODE=database`
- `DATABASE_URL` is present server-side

Otherwise `/ops/content/new` keeps using local browser storage. The browser never
receives `DATABASE_URL`.

## Required Env Vars

Keep these server-only in Vercel:

- `OPS_STORAGE_MODE=database`
- `DATABASE_URL=<approved Postgres connection string>`

Existing Basic Auth variables are still required:

- `OPS_BASIC_AUTH_USERNAME`
- `OPS_BASIC_AUTH_PASSWORD_SHA256`

## Schema Application

Apply `db/migrations/0001_ops_persistence.sql` to the approved Postgres database
before switching `OPS_STORAGE_MODE` to `database`.

The schema stores JSONB records to preserve compatibility with current exports
and avoid flattening unstable fields too early. Indexes are added for the join
keys needed to recompose content packages.

## Migration / Import Flow

1. Export local content packages from `/ops/content/new`.
2. Apply `db/migrations/0001_ops_persistence.sql` to the database.
3. Set `DATABASE_URL` and `OPS_STORAGE_MODE=database` server-side.
4. Verify `/ops/*` still fails closed without Basic Auth.
5. Import through the UI or POST exported JSON to
   `/ops/api/persistence/migrate`.
6. Reload `/ops/content/new` in another browser/session to confirm records load
   from the database.
7. Keep Export Package available as a manual backup.

## Hard Boundaries

- No AI API.
- No social API.
- No OAuth.
- No autoposting.
- No ad/spend mutation.
- No PHI.
- No patient identifiers.
- No encounter IDs or encounter text.
- No transcripts.
- No clinical payloads.
- No credentials, cookies, tokens, raw logs, private messages, audience exports,
  or platform secrets.

All database writes run metadata-only validation before write. Unsafe payloads
are rejected rather than partially stored.

## Verification Notes

Without a real `DATABASE_URL`, only fallback behavior can be verified locally.
Full DB verification requires an approved Postgres database and the schema above
applied.
