// Verifies the deployed /ops durable persistence + logout route end-to-end.
//
// Reads these from the environment or untracked .env.local (never printed):
//   OPS_VERIFY_URL            (optional, default https://www.bringhurstdo.com)
//   OPS_BASIC_AUTH_USERNAME   (your /ops Basic Auth username)
//   OPS_BASIC_AUTH_PASSWORD   (your /ops Basic Auth password, plaintext, for the request)
//
// Usage:
//   node scripts/verify-deploy.mjs
//
// Read-only: performs authenticated GET requests and reports status. It does not
// write data and does not log credentials.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function loadEnv(keys) {
  const out = {};
  for (const key of keys) {
    if (process.env[key]?.trim()) out[key] = process.env[key].trim();
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
        if (!keys.includes(key) || out[key]) continue;
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (value) out[key] = value;
      }
    } catch {
      // env file not present.
    }
  }

  return out;
}

async function main() {
  const env = loadEnv([
    "OPS_VERIFY_URL",
    "OPS_BASIC_AUTH_USERNAME",
    "OPS_BASIC_AUTH_PASSWORD",
  ]);

  const baseUrl = (env.OPS_VERIFY_URL ?? "https://www.bringhurstdo.com").replace(
    /\/+$/,
    "",
  );
  const username = env.OPS_BASIC_AUTH_USERNAME;
  const password = env.OPS_BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    console.error(
      "Missing OPS_BASIC_AUTH_USERNAME / OPS_BASIC_AUTH_PASSWORD. Add them to .env.local.",
    );
    process.exit(1);
  }

  const auth =
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  console.log(`Verifying deployment at ${baseUrl}\n`);

  // 1. Durable persistence route.
  const packagesRes = await fetch(`${baseUrl}/ops/api/persistence/packages`, {
    headers: { Accept: "application/json", Authorization: auth },
  });
  console.log(`GET /ops/api/persistence/packages -> ${packagesRes.status}`);

  if (packagesRes.status === 200) {
    const body = await packagesRes.json();
    const count = Array.isArray(body.contentPackages)
      ? body.contentPackages.length
      : "n/a";
    console.log(`  mode: ${body.mode}; source: ${body.source}; packages: ${count}`);
    console.log("  [ok] Deployed app is in durable database mode and reached Neon.");
  } else if (packagesRes.status === 503) {
    console.log(
      "  [warn] Route returned 503: OPS_STORAGE_MODE is not 'database' (or DATABASE_URL missing) on Vercel.",
    );
  } else if (packagesRes.status === 401) {
    console.log("  [fail] 401: Basic Auth credentials were rejected.");
  } else {
    console.log("  [fail] Unexpected status. Check Vercel logs / Neon schema.");
  }

  // 2. Logout re-challenge route.
  const logoutRes = await fetch(`${baseUrl}/ops/logout`, {
    headers: { Authorization: auth },
    redirect: "manual",
  });
  const logoutBody = await logoutRes.text();
  console.log(`\nGET /ops/logout -> ${logoutRes.status}`);
  if (
    logoutRes.status === 401 &&
    logoutBody.includes("You are logged out")
  ) {
    console.log("  [ok] Logout route is deployed and returns the re-challenge.");
  } else if (logoutRes.status === 404) {
    console.log("  [warn] 404: new logout route not deployed yet (build pending?).");
  } else {
    console.log("  [warn] Unexpected logout response.");
  }
}

main().catch((error) => {
  console.error("Deploy verification failed:", error.message ?? error);
  process.exit(1);
});
