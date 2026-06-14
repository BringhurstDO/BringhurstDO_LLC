import "server-only";

import { neon } from "@neondatabase/serverless";

import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import type { OpsAutopublishRunRecord } from "@/lib/ops/types";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

export async function saveAutopublishRunRecord(record: OpsAutopublishRunRecord) {
  if (!databasePersistenceConfigured()) {
    return {
      persisted: false,
      source: "database-not-configured",
    };
  }

  const now = new Date().toISOString();
  const sql = neon(getDatabaseUrl());

  await sql.query(
    `insert into ops_autopublish_runs
      (id, run_date, status, created_at, updated_at, schema_version, source_boundary, data)
     values ($1, $2, $3, $4, $4, 1, $5, $6::jsonb)
     on conflict (id) do update set
      run_date = excluded.run_date,
      status = excluded.status,
      updated_at = excluded.updated_at,
      schema_version = excluded.schema_version,
      source_boundary = excluded.source_boundary,
      data = excluded.data`,
    [
      record.id,
      record.runDate,
      record.status,
      now,
      record.sourceBoundary,
      JSON.stringify(record),
    ],
  );

  return {
    persisted: true,
    source: "postgres",
  };
}
