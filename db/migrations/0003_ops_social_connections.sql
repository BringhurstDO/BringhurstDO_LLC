-- BringhurstDO Ops Phase 7A social account connections + publish audit log.
-- Stores ONLY: platform, account/author metadata, encrypted OAuth tokens, scopes,
-- expiry, and publish outcomes. Access tokens are AES-256-GCM encrypted at rest
-- with OPS_SOCIAL_TOKEN_SECRET and are never returned to the browser.
-- No PHI, raw logs, plaintext tokens, client secrets, or private messages.

create table if not exists ops_social_connections (
  id text primary key,
  platform text not null,
  account_id text not null,
  author_type text not null,
  author_urn text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create unique index if not exists ops_social_connections_platform_account_idx
  on ops_social_connections (platform, account_id);

create table if not exists ops_social_publish_log (
  id text primary key,
  platform text not null,
  content_package_id text not null,
  platform_draft_id text not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_social_publish_log_platform_draft_id_idx
  on ops_social_publish_log (platform_draft_id);

create index if not exists ops_social_publish_log_content_package_id_idx
  on ops_social_publish_log (content_package_id);
