import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const flagSvgPath = path.join(root, "public", "flag-of-the-united-states.svg");
const bringhurstSvgPath = path.join(root, "public", "Icon-BringhurstDOLLC.svg");
const syncsoapSvgPath = path.join(root, "syncsoap-logo.svg");
const syncsafetySvgPath = path.join(root, "public", "syncsafety-logo.svg");
const outDir = path.join(root, "public", "ops-ig");

const COLORS = {
  blue: "#1d4ed8",
  muted: "#64748b",
  navy: "#0f172a",
  red: "#b91c1c",
};

async function rasterSvg(svgPath, width, height = width) {
  return sharp(svgPath, { density: 240 })
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function rasterFlag(width) {
  const height = Math.round(width * (3900 / 7410));
  return rasterSvg(flagSvgPath, width, height);
}

function baseSquareSvg() {
  return Buffer.from(`<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="58%" stop-color="#fbfdff"/>
      <stop offset="100%" stop-color="#f3f7fb"/>
    </linearGradient>
    <radialGradient id="softBlue" cx="82%" cy="78%" r="46%">
      <stop offset="0%" stop-color="#dbeafe" stop-opacity="0.72"/>
      <stop offset="62%" stop-color="#dbeafe" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#dbeafe" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="softRed" cx="18%" cy="15%" r="38%">
      <stop offset="0%" stop-color="#fee2e2" stop-opacity="0.58"/>
      <stop offset="66%" stop-color="#fee2e2" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#fee2e2" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1080" height="1080" fill="url(#page)"/>
  <rect width="1080" height="1080" fill="url(#softBlue)"/>
  <rect width="1080" height="1080" fill="url(#softRed)"/>
  <rect width="1080" height="10" fill="${COLORS.red}"/>
  <rect y="1070" width="1080" height="10" fill="${COLORS.blue}"/>

  <line x1="260" y1="432" x2="820" y2="432" stroke="#dbe4ef" stroke-width="1"/>
  <text x="540" y="476" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="36" font-weight="800" fill="${COLORS.blue}">1776-2026</text>
  <text x="540" y="548" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="54" font-weight="800" fill="${COLORS.navy}">America&apos;s 250th Birthday</text>
  <text x="540" y="606" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="${COLORS.red}">Celebrating American healthcare innovation</text>
  <text x="540" y="651" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="500" fill="${COLORS.muted}">BringhurstDO, SyncSOAP, and SyncSafety</text>

  <line x1="162" y1="710" x2="918" y2="710" stroke="#dbe4ef" stroke-width="1.5"/>
  <line x1="162" y1="840" x2="918" y2="840" stroke="#dbe4ef" stroke-width="1.5"/>
  <line x1="387" y1="728" x2="387" y2="822" stroke="#dbe4ef" stroke-width="1.5"/>
  <line x1="693" y1="728" x2="693" y2="822" stroke="#dbe4ef" stroke-width="1.5"/>

  <text x="208" y="770" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="800" fill="${COLORS.navy}">BringhurstDO</text>
  <text x="208" y="805" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="500" fill="${COLORS.muted}">venture studio</text>

  <text x="508" y="770" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="800">
    <tspan fill="${COLORS.navy}">Sync</tspan><tspan fill="#00a3da">SOAP</tspan>
  </text>
  <text x="508" y="805" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="500" fill="${COLORS.muted}">AI clinical notes</text>

  <text x="810" y="770" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="800">
    <tspan fill="${COLORS.navy}">Sync</tspan><tspan fill="#f2b705">Safety</tspan>
  </text>
  <text x="810" y="805" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="500" fill="${COLORS.muted}">safety workflows</text>

  <rect x="376" y="897" width="96" height="14" rx="4" fill="${COLORS.red}"/>
  <rect x="490" y="897" width="100" height="14" rx="4" fill="#ffffff" stroke="#dbe4ef" stroke-width="1"/>
  <rect x="608" y="897" width="96" height="14" rx="4" fill="${COLORS.blue}"/>
  <text x="540" y="966" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="27" font-weight="800" fill="${COLORS.navy}">bringhurstdo.com</text>
</svg>`);
}

async function renderSquare(fileName) {
  const [flag, bringhurstLogo, syncsoapLogo, syncsafetyLogo, background] = await Promise.all([
    rasterFlag(560),
    rasterSvg(bringhurstSvgPath, 74, 80),
    rasterSvg(syncsoapSvgPath, 66, 66),
    rasterSvg(syncsafetySvgPath, 66, 66),
    sharp(baseSquareSvg()).png().toBuffer(),
  ]);

  return sharp(background)
    .composite([
      { input: flag, left: 260, top: 112 },
      { input: bringhurstLogo, left: 125, top: 732 },
      { input: syncsoapLogo, left: 428, top: 732 },
      { input: syncsafetyLogo, left: 730, top: 732 },
    ])
    .png()
    .toFile(path.join(outDir, fileName));
}

async function renderFacebook() {
  const [flag, background] = await Promise.all([
    rasterFlag(390),
    sharp(baseSquareSvg()).resize(1200, 630, { fit: "cover" }).png().toBuffer(),
  ]);

  return sharp(background)
    .composite([{ input: flag, left: 405, top: 42 }])
    .png()
    .toFile(path.join(outDir, "america-250-facebook.png"));
}

mkdirSync(outDir, { recursive: true });

const square = await renderSquare("america-250-square.png");
const squareBrands = await renderSquare("america-250-square-brands.png");
const facebook = await renderFacebook();

writeFileSync(
  path.join(outDir, "america-250-assets.json"),
  JSON.stringify(
    {
      colors: COLORS,
      flagSvg: "/flag-of-the-united-states.svg",
      logos: {
        bringhurst: "/Icon-BringhurstDOLLC.svg",
        syncsoap: "/syncsoap-logo.svg",
        syncsafety: "/syncsafety-logo.svg",
      },
      outputs: [
        { file: "america-250-square.png", ...square },
        { file: "america-250-square-brands.png", ...squareBrands },
        { file: "america-250-facebook.png", ...facebook },
      ],
    },
    null,
    2,
  ),
);

console.log("Rendered America 250 social assets:");
console.log(`  public/ops-ig/america-250-square.png (${square.width}x${square.height})`);
console.log(`  public/ops-ig/america-250-square-brands.png (${squareBrands.width}x${squareBrands.height})`);
console.log(`  public/ops-ig/america-250-facebook.png (${facebook.width}x${facebook.height})`);
