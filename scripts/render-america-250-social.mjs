import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const flagSvgPath = path.join(root, "public", "flag-of-the-united-states.svg");
const outDir = path.join(root, "public", "ops-ig");

const COLORS = {
  bg: "#fafcfd",
  blue: "#1d4ed8",
  muted: "#64748b",
  red: "#b91c1c",
  slate: "#0f172a",
  stripeBlue: "#1d4ed8",
  stripeRed: "#b91c1c",
};

async function rasterFlag(width) {
  const height = Math.round(width * (3900 / 7410));

  return sharp(flagSvgPath, { density: 200 })
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

function layoutSvg({ width, height, variant }) {
  const isSquare = variant === "square";
  const titleSize = isSquare ? 52 : 44;
  const yearSize = isSquare ? 40 : 34;
  const siteSize = isSquare ? 28 : 24;
  const subtitleSize = isSquare ? 24 : 20;
  const titleY = isSquare ? 620 : 360;
  const yearY = isSquare ? 690 : 410;
  const subtitleY = isSquare ? 760 : 455;
  const siteY = isSquare ? 860 : 520;
  const barY = isSquare ? 930 : 560;
  const barW = isSquare ? 220 : 180;
  const barH = isSquare ? 14 : 12;
  const barX = (width - barW) / 2;

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${COLORS.bg}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#wash)"/>
  <rect x="0" y="0" width="${width}" height="10" fill="${COLORS.red}" opacity="0.85"/>
  <rect x="0" y="${height - 10}" width="${width}" height="10" fill="${COLORS.blue}" opacity="0.85"/>
  <text x="${width / 2}" y="${titleY}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${titleSize}" font-weight="700" fill="${COLORS.red}">
    Celebrating America&apos;s 250th Birthday
  </text>
  <text x="${width / 2}" y="${yearY}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${yearSize}" font-weight="700" fill="${COLORS.blue}">
    1776-2026
  </text>
  <text x="${width / 2}" y="${subtitleY}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${subtitleSize}" font-weight="500" fill="${COLORS.muted}">
    Commemorative accent on BringhurstDO.com
  </text>
  <text x="${width / 2}" y="${siteY}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${siteSize}" font-weight="600" fill="${COLORS.slate}">
    bringhurstdo.com
  </text>
  <rect x="${barX}" y="${barY}" width="${barW / 3}" height="${barH}" rx="2" fill="${COLORS.stripeRed}"/>
  <rect x="${barX + barW / 3}" y="${barY}" width="${barW / 3}" height="${barH}" rx="2" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="${barX + (2 * barW) / 3}" y="${barY}" width="${barW / 3}" height="${barH}" rx="2" fill="${COLORS.stripeBlue}"/>
</svg>`);
}

async function renderVariant({ width, height, flagWidth, flagTop, variant, fileName }) {
  const flag = await rasterFlag(flagWidth);
  const flagMeta = await sharp(flag).metadata();
  const flagLeft = Math.round((width - (flagMeta.width ?? flagWidth)) / 2);
  const background = await sharp(layoutSvg({ width, height, variant })).png().toBuffer();

  const output = await sharp(background)
    .composite([
      {
        input: flag,
        left: flagLeft,
        top: flagTop,
      },
    ])
    .png()
    .toFile(path.join(outDir, fileName));

  return output;
}

mkdirSync(outDir, { recursive: true });

const square = await renderVariant({
  width: 1080,
  height: 1080,
  flagWidth: 560,
  flagTop: 120,
  variant: "square",
  fileName: "america-250-square.png",
});

const facebook = await renderVariant({
  width: 1200,
  height: 630,
  flagWidth: 420,
  flagTop: 72,
  variant: "facebook",
  fileName: "america-250-facebook.png",
});

writeFileSync(
  path.join(outDir, "america-250-assets.json"),
  JSON.stringify(
    {
      colors: COLORS,
      flagSvg: "/flag-of-the-united-states.svg",
      outputs: [
        { file: "america-250-square.png", ...square },
        { file: "america-250-facebook.png", ...facebook },
      ],
    },
    null,
    2,
  ),
);

console.log("Rendered America 250 social assets:");
console.log(`  public/ops-ig/america-250-square.png (${square.width}x${square.height})`);
console.log(`  public/ops-ig/america-250-facebook.png (${facebook.width}x${facebook.height})`);
