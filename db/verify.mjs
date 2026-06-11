// Verifies the BringhurstDO Ops Postgres schema is applied and reachable.
//
// Usage:
//   node db/verify.mjs            (reads DATABASE_URL from env or .env.local/.env)
//
// Reports which ops_* tables exist and their row counts. Exits non-zero if any
// expected table is missing. Read-only: it does not write or mutate data.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));

const expectedTables = [
  "ops_account_registry",
  "ops_ai_prompt_history",
  "ops_audience_profiles",
  "ops_brand_rules",
  "ops_business_outcomes",
  "ops_content_packages",
  "ops_media_metadata",
  "ops_performance_snapshots",
  "ops_platform_drafts",
  "ops_published_posts",
  "ops_source_updates",
];

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  for (const envFile of [".env.local", ".env"]) {
    try {
      const contents = readFileSync(join(here, "..", envFile), "utf8");
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq < 0) continue;
        const key = line.slice(0, eq).trim();
        if (key !== "DATABASE_URL") continue;
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (value) return value;
      }
    } catch {
      // env file not present; keep looking.
    }
  }

  return "";
}

async function main() {
  const databaseUrl = loadDatabaseUrl();

  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is not set. Add it to .env.local (untracked) or export it before running.",
    );
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  const present = await sql.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name like 'ops_%'
     order by table_name`,
  );
  const presentNames = new Set(present.map((row) => row.table_name));

  console.log("Ops table status:");
  for (const table of expectedTables) {
    if (presentNames.has(table)) {
      const counted = await sql.query(`select count(*)::int as n from ${table}`);
      console.log(`  [ok] ${table} (${counted[0].n} rows)`);
    } else {
      console.log(`  [MISSING] ${table}`);
    }
  }

  const missing = expectedTables.filter((table) => !presentNames.has(table));

  if (missing.length > 0) {
    console.error(
      `\nVerification failed: ${missing.length} expected table(s) missing. Run: npm run db:migrate`,
    );
    process.exit(1);
  }

  console.log("\nVerification passed: all expected Ops tables are present.");
}

main().catch((error) => {
  console.error("Verification failed:", error.message ?? error);
  process.exit(1);
});
