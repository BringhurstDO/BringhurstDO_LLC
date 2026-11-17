import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import sharp from "sharp";

import {
  prepareInstagramImage,
  prepareXMediaForUpload,
} from "../lib/ops/social-media-normalize";

async function main() {
  const width = 2048;
  const height = 2048;
  const noisyPng = await sharp(randomBytes(width * height * 3), {
    raw: { channels: 3, height, width },
  })
    .png()
    .toBuffer();

  assert.ok(noisyPng.byteLength > 5 * 1024 * 1024);
  const preparedX = await prepareXMediaForUpload({
    bytes: new Uint8Array(noisyPng),
    contentType: "image/png",
    kind: "image",
  });
  assert.equal(preparedX.transformed, true);
  assert.equal(preparedX.contentType, "image/jpeg");
  assert.ok(preparedX.bytes.byteLength < 5 * 1024 * 1024);

  const tallImage = await sharp({
    create: {
      background: "#238696",
      channels: 3,
      height: 1600,
      width: 900,
    },
  })
    .jpeg()
    .toBuffer();
  const preparedInstagram = await prepareInstagramImage({
    bytes: new Uint8Array(tallImage),
    contentType: "image/jpeg",
  });
  const instagramMetadata = await sharp(preparedInstagram.bytes).metadata();

  assert.equal(preparedInstagram.transformed, true);
  assert.equal(preparedInstagram.contentType, "image/jpeg");
  assert.equal(instagramMetadata.width, 1080);
  assert.equal(instagramMetadata.height, 1350);

  console.log("Social media image normalization checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
