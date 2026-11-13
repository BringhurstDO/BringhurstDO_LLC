import assert from "node:assert/strict";

import {
  assertOpsMediaBlobPath,
  createOpsMediaBlobPath,
  inferOpsMediaContentType,
  parseOpsMediaUploadClientPayload,
} from "../lib/ops/ops-media-upload-policy";

const payload = parseOpsMediaUploadClientPayload(
  JSON.stringify({
    contentType: "image/jpeg",
    projectId: "syncsoap",
    size: 1_316_710,
  }),
);
const pathname = createOpsMediaBlobPath({
  contentType: payload.contentType,
  originalName: "1-Photo-1.jpg",
  projectId: payload.projectId,
  uniqueId: "test123",
});

assert.equal(pathname, "ops-ig/syncsoap/1-photo-1-test123.jpg");
assert.equal(inferOpsMediaContentType("1-Photo-1.jpg", ""), "image/jpeg");
assert.doesNotThrow(() => assertOpsMediaBlobPath(pathname, payload));
assert.throws(
  () => assertOpsMediaBlobPath("ops-ig/bringhurstdo/photo.jpg", payload),
  /Upload path is invalid/,
);
assert.throws(
  () =>
    parseOpsMediaUploadClientPayload(
      JSON.stringify({
        contentType: "image/jpeg",
        projectId: "syncsoap",
        size: 9 * 1024 * 1024,
      }),
    ),
  /8 MB or smaller/,
);

console.log("Ops media upload policy checks passed.");
