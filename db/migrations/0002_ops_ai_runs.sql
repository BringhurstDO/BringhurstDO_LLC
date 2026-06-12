-- BringhurstDO Ops Phase 6A AI run metadata.
-- Stores run status, model/provider, token/cost estimates, and safety results only.
-- No API keys, prompts with secrets, raw logs, or forbidden clinical payloads.

create table if not exists ops_ai_runs (
  id text primary key,
  content_package_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_ai_runs_content_package_id_idx
  on ops_ai_runs (content_package_id);

create index if not exists ops_ai_runs_data_content_package_id_idx
  on ops_ai_runs ((data->>'contentPackageId'));
