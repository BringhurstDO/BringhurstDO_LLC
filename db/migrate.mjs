// Applies BringhurstDO Ops SQL migrations to the configured Postgres database.
//
// Usage:
//   node db/migrate.mjs            (reads DATABASE_URL from env or .env.local/.env)
//
// The connection string stays server-only. Provide it via the DATABASE_URL
// environment variable or an untracked .env.local file. Never commit it.
//
// Safe to re-run: every statement in db/migrations is CREATE ... IF NOT EXISTS.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "migrations");

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

function splitStatements(sqlText) {
  return sqlText
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
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

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No .sql migrations found in ${migrationsDir}.`);
    process.exit(1);
  }

  for (const file of files) {
    const statements = splitStatements(
      readFileSync(join(migrationsDir, file), "utf8"),
    );
    console.log(`Applying ${file} (${statements.length} statements)...`);

    for (const statement of statements) {
      await sql.query(statement);
    }
  }

  const tables = await sql.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name like 'ops_%'
     order by table_name`,
  );

  console.log(`\nMigration complete. Ops tables present (${tables.length}):`);
  for (const row of tables) {
    console.log(`  - ${row.table_name}`);
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message ?? error);
  process.exit(1);
});
