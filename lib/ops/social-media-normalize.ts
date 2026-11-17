import sharp from "sharp";
import type { Metadata } from "sharp";

import type { OpsPublishMediaKind } from "@/lib/ops/ops-media-kind";

const X_SIMPLE_IMAGE_LIMIT_BYTES = 5 * 1024 * 1024;
const X_NORMALIZED_IMAGE_TARGET_BYTES = 4_750_000;

export type PreparedPublishMedia = {
  bytes: Uint8Array;
  contentType: string;
  kind: OpsPublishMediaKind;
  transformed: boolean;
};

export async function prepareXMediaForUpload(input: {
  bytes: Uint8Array;
  contentType: string;
  kind: OpsPublishMediaKind;
}): Promise<PreparedPublishMedia> {
  if (
    input.kind !== "image" ||
    input.bytes.byteLength <= X_SIMPLE_IMAGE_LIMIT_BYTES
  ) {
    return { ...input, transformed: false };
  }

  const attempts = [
    { maxDimension: 4096, quality: 86 },
    { maxDimension: 3200, quality: 78 },
    { maxDimension: 2400, quality: 68 },
  ];

  for (const attempt of attempts) {
    const rendered = await sharp(Buffer.from(input.bytes))
      .rotate()
      .resize({
        fit: "inside",
        height: attempt.maxDimension,
        width: attempt.maxDimension,
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ mozjpeg: true, quality: attempt.quality })
      .toBuffer();

    if (rendered.byteLength <= X_NORMALIZED_IMAGE_TARGET_BYTES) {
      return {
        bytes: new Uint8Array(rendered),
        contentType: "image/jpeg",
        kind: "image",
        transformed: true,
      };
    }
  }

  throw new Error("X image could not be reduced below the 5 MB upload limit.");
}

function orientedDimensions(metadata: Metadata) {
  const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;

  if (!width || !height) {
    throw new Error("Instagram image dimensions could not be determined.");
  }

  return { height, width };
}

export async function prepareInstagramImage(input: {
  bytes: Uint8Array;
  contentType: string;
}) {
  const source = sharp(Buffer.from(input.bytes));
  const dimensions = orientedDimensions(await source.metadata());
  const aspectRatio = dimensions.width / dimensions.height;
  let pipeline = sharp(Buffer.from(input.bytes)).rotate();

  if (aspectRatio < 4 / 5) {
    pipeline = pipeline.resize({
      background: "#ffffff",
      fit: "contain",
      height: 1350,
      width: 1080,
    });
  } else if (aspectRatio > 1.91) {
    pipeline = pipeline.resize({
      background: "#ffffff",
      fit: "contain",
      height: 566,
      width: 1080,
    });
  } else {
    pipeline = pipeline.resize({
      fit: "inside",
      height: 1440,
      width: 1440,
      withoutEnlargement: true,
    });
  }

  const rendered = await pipeline
    .flatten({ background: "#ffffff" })
    .jpeg({ mozjpeg: true, quality: 88 })
    .toBuffer();

  return {
    bytes: new Uint8Array(rendered),
    contentType: "image/jpeg",
    transformed:
      input.contentType !== "image/jpeg" ||
      aspectRatio < 4 / 5 ||
      aspectRatio > 1.91 ||
      rendered.byteLength < input.bytes.byteLength,
  };
}
