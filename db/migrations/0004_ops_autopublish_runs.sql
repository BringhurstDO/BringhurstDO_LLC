-- BringhurstDO Ops Phase 8C scheduled autopublish audit log.
-- Metadata-only run summaries. No tokens, PHI, or draft bodies stored here.

create table if not exists ops_autopublish_runs (
  id text primary key,
  run_date text not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  schema_version integer not null default 1,
  source_boundary text not null,
  data jsonb not null
);

create index if not exists ops_autopublish_runs_run_date_idx
  on ops_autopublish_runs (run_date desc);
