// Generates the OPS_BASIC_AUTH_PASSWORD_SHA256 value for a new operator password.
//
// Usage (interactive, keeps the password out of shell history):
//   node scripts/hash-ops-password.mjs
//
// Or pipe it in:
//   "my new password" | node scripts/hash-ops-password.mjs   (PowerShell: echo "pw" | node ...)
//
// Copy the printed hash into:
//   - Vercel project env var OPS_BASIC_AUTH_PASSWORD_SHA256 (Production), then redeploy
//   - your local .env.local (optional, for local /ops testing)
//
// The password itself is never stored or printed. This only prints its SHA-256
// hash, which is what the Basic Auth middleware compares against.

import { createHash } from "node:crypto";
import { createInterface } from "node:readline";

function hash(password) {
  return createHash("sha256").update(password, "utf8").digest("hex");
}

function readFromStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  let password;

  if (process.stdin.isTTY) {
    password = (await prompt("New operator password: ")).replace(/\r?\n$/, "");
  } else {
    password = (await readFromStdin()).replace(/\r?\n$/, "");
  }

  if (!password) {
    console.error("No password provided. Aborting.");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error(
      "Password must be at least 12 characters. Choose a stronger password.",
    );
    process.exit(1);
  }

  console.log("\nOPS_BASIC_AUTH_PASSWORD_SHA256=" + hash(password));
  console.log(
    "\nSet this in Vercel (Production) and redeploy, then log out and back in.",
  );
}

main();
