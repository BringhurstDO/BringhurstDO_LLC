const Module = require("module");
const path = require("path");
const fs = require("fs");

for (const file of [".env.local", ".env"]) {
  try {
    for (const raw of fs.readFileSync(path.resolve(file), "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const eq = line.indexOf("=");
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad(request, parent, isMain);
};

require("tsx/cjs/api").register();

async function main() {
  const { applySocialPublishLogBackfill } = require(
    path.resolve(__dirname, "../lib/ops/social-publish-log-backfill.ts"),
  );
  const result = await applySocialPublishLogBackfill();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
