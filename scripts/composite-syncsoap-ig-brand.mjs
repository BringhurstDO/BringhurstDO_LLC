import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceSvgPath = path.join(root, "syncsoap-logo.svg");
const sourceSvg = readFileSync(sourceSvgPath, "utf8");

/** Canonical geometry from syncsoap-logo.svg (viewBox 0 0 100 100). */
export const SYNCSOAP_DELTA_GEOMETRY = {
  centerNode: { cx: 50, cy: 55, r: 5 },
  outerNodes: [
    { cx: 50, cy: 15, r: 8 },
    { cx: 15, cy: 80, r: 8 },
    { cx: 85, cy: 80, r: 8 },
  ],
  strokeWidth: 4,
  trianglePoints: "50,15 15,80 85,80",
  color: "#00A3DA",
};

function optimizedSvgRaster(size) {
  const svg = sourceSvg
    .replace(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"`,
    );

  return sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function backgroundPad(width, height, fill, radius = 16) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fill}"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function circularBadge(size) {
  const logoSize = Math.round(size * 0.58);
  const logo = await optimizedSvgRaster(logoSize);
  const inset = Math.round((size - logoSize) / 2);

  const circle = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 163, b: 218, alpha: 1 },
    },
  })
    .composite([{ input: logo, left: inset, top: inset }])
    .png()
    .toBuffer();

  return circle;
}

/**
 * Placements tuned for the 1536x1024 SyncSOAP IG marketing asset.
 * Coordinates derived from pixel scans of the AI base image so every bogus
 * logo mark is fully covered and replaced with syncsoap-logo.svg.
 */
const placementsFor1536x1024 = [
  // Wordmark delta (AI icon footprint ≈ 67–160 × 87–187; pad adds margin)
  { kind: "pad", pad: [120, 148, 18], fill: "#fafcfd", left: 52, top: 76 },
  { kind: "logo", logoSize: 104, left: 58, top: 84 },

  // HIPAA badge icon (AI icon ≈ 61–134 × 860–915; was misplaced at y=928)
  { kind: "pad", pad: [78, 68, 34], fill: "#fafcfd", left: 56, top: 854 },
  { kind: "badge", badgeSize: 54, left: 71, top: 861 },

  // Stray delta left of the phone bezel (AI artifact ≈ 440–478 × 130–169)
  { kind: "pad", pad: [88, 52, 10], fill: "#fafcfd", left: 432, top: 122 },

  // Phone app header bar (≈ 516–679 × 160–249)
  { kind: "pad", pad: [170, 94, 12], fill: "#f9fbfd", left: 510, top: 156 },
  { kind: "logo", logoSize: 32, left: 522, top: 168 },

  // Floating side-tab artifact protruding from the phone bezel
  { kind: "pad", pad: [52, 118, 8], fill: "#fafcfd", left: 508, top: 226 },
];

export async function compositeSyncSoapBrand({
  inputPath,
  outputPath = inputPath,
  placements = placementsFor1536x1024,
}) {
  const composite = [];

  for (const placement of placements) {
    if (placement.kind === "pad") {
      composite.push({
        input: await backgroundPad(
          placement.pad[0],
          placement.pad[1],
          placement.fill,
          placement.pad[2],
        ),
        left: placement.left,
        top: placement.top,
      });
      continue;
    }

    if (placement.kind === "badge") {
      composite.push({
        input: await circularBadge(placement.badgeSize),
        left: placement.left,
        top: placement.top,
      });
      continue;
    }

    composite.push({
      input: await optimizedSvgRaster(placement.logoSize),
      left: placement.left,
      top: placement.top,
    });
  }

  await sharp(inputPath).composite(composite).png().toFile(outputPath);

  return outputPath;
}

async function writeVerificationAssets() {
  const verifyDir = path.join(root, "public", "ops-ig");
  const reference = await optimizedSvgRaster(512);
  writeFileSync(path.join(verifyDir, "syncsoap-delta-reference.png"), reference);
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const repoBase = path.join(
    root,
    "public",
    "ops-ig",
    "syncsoap-product-screenshot-base.png",
  );
  const cursorBase = path.join(
    process.env.USERPROFILE ?? "",
    ".cursor",
    "projects",
    "c-Users-aktwi-SyncApps-BringhurstDO-LLC",
    "assets",
    "syncsoap-product-screenshot.png",
  );
  const targetImage = path.join(root, "public", "ops-ig", "syncsoap-product-screenshot.png");
  const inputPath = process.argv[2] ?? repoBase;

  await writeVerificationAssets();
  const output = await compositeSyncSoapBrand({ inputPath, outputPath: targetImage });
  console.log(`Composited canonical syncsoap-logo.svg onto ${output}`);
}
