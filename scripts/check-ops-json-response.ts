import assert from "node:assert/strict";

import { readOpsJson } from "../app/ops/_components/ops-fetch";

async function main() {
  const parsed = await readOpsJson<{ ok: boolean }>(
    new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  );
  assert.equal(parsed.ok, true);

  await assert.rejects(
    () =>
      readOpsJson(
        new Response("<!DOCTYPE html><html><body>Gateway error</body></html>", {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-vercel-id": "iad1::test-request",
          },
          status: 504,
          statusText: "Gateway Timeout",
        }),
        "Instagram publish failed.",
      ),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.match(error.message, /HTTP 504 Gateway Timeout/);
      assert.match(error.message, /HTML error page instead of JSON/);
      assert.match(error.message, /iad1::test-request/);
      return true;
    },
  );

  console.log("Ops JSON response checks passed.");
}

void main();
