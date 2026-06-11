-- BringhurstDO Ops durable persistence schema.
-- Metadata-only records only: no PHI, credentials, raw logs, transcripts,
-- patient identifiers, clinical payloads, private messages, or secret values.

create table if not exists ops_source_updates (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create table if not exists ops_content_packages (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create table if not exists ops_platform_drafts (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_platform_drafts_content_package_id_idx
  on ops_platform_drafts ((data->>'contentPackageId'));

create table if not exists ops_published_posts (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_published_posts_platform_draft_id_idx
  on ops_published_posts ((data->>'platformDraftId'));

create table if not exists ops_performance_snapshots (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_performance_snapshots_published_post_id_idx
  on ops_performance_snapshots ((data->>'publishedPostId'));

create table if not exists ops_business_outcomes (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_business_outcomes_content_package_id_idx
  on ops_business_outcomes ((data->>'contentPackageId'));

create table if not exists ops_media_metadata (
  id text primary key,
  platform_draft_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_media_metadata_platform_draft_id_idx
  on ops_media_metadata (platform_draft_id);

create table if not exists ops_account_registry (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create table if not exists ops_brand_rules (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create table if not exists ops_audience_profiles (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create table if not exists ops_ai_prompt_history (
  id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);
