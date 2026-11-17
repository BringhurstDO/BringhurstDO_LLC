import assert from "node:assert/strict";

import { uploadXMediaChunked } from "../lib/ops/x-media-upload";

type RecordedCall = {
  init?: RequestInit;
  url: string;
};

const calls: RecordedCall[] = [];
const waits: number[] = [];
const responses = [
  {
    body: JSON.stringify({
      detail: "Service Unavailable",
      status: 503,
      title: "Service Unavailable",
    }),
    status: 503,
  },
  { body: JSON.stringify({ data: { id: "123456789" } }), status: 200 },
  { body: "", status: 204 },
  {
    body: JSON.stringify({
      data: { processing_info: { check_after_secs: 1, state: "pending" } },
    }),
    status: 200,
  },
  {
    body: JSON.stringify({
      data: { processing_info: { state: "succeeded" } },
    }),
    status: 200,
  },
];

const mockedFetch: typeof fetch = async (input, init) => {
  calls.push({ init, url: String(input) });
  const response = responses.shift();

  assert.ok(response, "Unexpected extra X request");

  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    text: async () => response.body,
  } as Response;
};

async function main() {
  const mediaId = await uploadXMediaChunked(
    {
      accessToken: "test-token",
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
      kind: "image",
      uploadUrl: "https://api.x.com/2/media/upload",
    },
    {
      fetch: mockedFetch,
      sleep: async (ms) => {
        waits.push(ms);
      },
    },
  );

  assert.equal(mediaId, "123456789");
  assert.equal(calls.length, 5);
  assert.deepEqual(waits, [1000, 1000]);

  assert.equal(calls[0].url, "https://api.x.com/2/media/upload/initialize");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(calls[1].url, "https://api.x.com/2/media/upload/initialize");
  assert.equal(calls[1].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
    media_type: "image/png",
    total_bytes: 3,
    media_category: "tweet_image",
  });
  assert.equal(
    (calls[1].init?.headers as Record<string, string>)["Content-Type"],
    "application/json",
  );

  assert.equal(calls[2].url, "https://api.x.com/2/media/upload/123456789/append");
  assert.equal(calls[2].init?.method, "POST");
  assert.ok(calls[2].init?.body instanceof FormData);
  const appendForm = calls[2].init?.body as FormData;
  assert.equal(appendForm.get("segment_index"), "0");
  assert.ok(appendForm.get("media") instanceof Blob);
  assert.equal(appendForm.has("command"), false);
  assert.equal(appendForm.has("media_id"), false);

  assert.equal(calls[3].url, "https://api.x.com/2/media/upload/123456789/finalize");
  assert.equal(calls[3].init?.method, "POST");
  assert.equal(calls[3].init?.body, undefined);

  assert.equal(
    calls[4].url,
    "https://api.x.com/2/media/upload?command=STATUS&media_id=123456789",
  );
  assert.equal(calls[4].init?.method, "GET");
  assert.equal(responses.length, 0);

  console.log("X v2 chunked media upload protocol checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
