import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "ops-ig");

const SIZE = { width: 1536, height: 1024 };

const BRANDS = {
  syncsafety: {
    accent: "#FFC107",
    accentSoft: "#FFF8E1",
    badgeFill: "#FFC107",
    badgeInk: "#1a1a1a",
    id: "syncsafety",
    logoPath: path.join(root, "public", "syncsafety-logo.svg"),
    logoCrop: null,
    nameHtml: `<tspan fill="#0f172a">Sync</tspan><tspan fill="#FFC107">Safety</tspan>`,
    outputs: {
      landscape: "syncsafety-product-cover-landscape.png",
      square: "syncsafety-product-cover-square.png",
      facebook: "syncsafety-product-cover-facebook.png",
    },
    site: "bringhurstdo.com/syncsafety",
    subhead: "Guided recordability, OSHA exports, and less administrative tax.",
    tagline: "Safety workflows for modern teams",
    titleAccent: "Software handles the forms.",
    titleMain: "Focus on the floor.",
    trust: "OSHA 1904 aligned. Audit-ready records.",
    features: [
      { title: "Save Time", body: "OSHA exports without spreadsheet rebuilds" },
      { title: "Stay Accurate", body: "Guided recordability after incidents" },
      { title: "Built for EHS", body: "Structured logs, programs, and reports" },
      { title: "Better Reporting", body: "Cleaner data for leadership reviews" },
    ],
    mock: "safety",
  },
  bringhurstdo: {
    accent: "#247D8A",
    accentSoft: "#E8F4F6",
    badgeFill: "#247D8A",
    badgeInk: "#ffffff",
    id: "bringhurstdo",
    logoPath: path.join(root, "public", "Icon-BringhurstDOLLC.svg"),
    logoCrop: "680 80 680 1180",
    nameHtml: `<tspan fill="#247D8A">Bringhurst</tspan><tspan fill="#586B76">DO</tspan>`,
    outputs: {
      landscape: "bringhurstdo-product-cover-landscape.png",
      square: "bringhurstdo-product-cover-square.png",
      facebook: "bringhurstdo-product-cover-facebook.png",
    },
    site: "bringhurstdo.com",
    subhead:
      "Clinical, industrial, and learning workflow products built practitioner-first.",
    tagline: "Healthcare & industrial venture studio",
    titleAccent: "We build the systems.",
    titleMain: "Focus on operators.",
    trust: "Practitioner-informed. Security-first.",
    features: [
      { title: "Clinical", body: "AI documentation with SyncSOAP" },
      { title: "Industrial", body: "Safety and compliance with SyncSafety" },
      { title: "Venture Studio", body: "Operator-led product development" },
      { title: "Compliance", body: "HIPAA and OSHA aligned architecture" },
    ],
    mock: "studio",
  },
};

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function rasterLogo(brand, size) {
  let svg = readFileSync(brand.logoPath, "utf8");

  if (brand.logoCrop) {
    svg = svg
      .replace('viewBox="0 0 2048 2200"', `viewBox="${brand.logoCrop}"`)
      .replace(/<text[\s\S]*?<\/text>/, "");
  }

  return sharp(Buffer.from(svg), { density: 240 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function featureIcon(index, color) {
  const icons = [
    `<circle cx="24" cy="24" r="22" fill="${color}" opacity="0.14"/><path d="M24 12v14l9 5" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="24" cy="24" r="22" fill="${color}" opacity="0.14"/><circle cx="24" cy="24" r="10" fill="none" stroke="${color}" stroke-width="3"/><circle cx="24" cy="24" r="3" fill="${color}"/>`,
    `<circle cx="24" cy="24" r="22" fill="${color}" opacity="0.14"/><path d="M14 26l7-10 6 6 11-14 8 10" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="24" cy="24" r="22" fill="${color}" opacity="0.14"/><rect x="13" y="28" width="6" height="10" rx="1" fill="${color}"/><rect x="22" y="22" width="6" height="16" rx="1" fill="${color}"/><rect x="31" y="16" width="6" height="22" rx="1" fill="${color}"/>`,
  ];

  return icons[index % icons.length];
}

function safetyPhoneMock(accent) {
  return Buffer.from(`<svg width="430" height="760" viewBox="0 0 430 760" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="414" height="744" rx="42" fill="#111827"/>
  <rect x="20" y="24" width="390" height="712" rx="34" fill="#f3f4f6"/>
  <rect x="145" y="34" width="140" height="24" rx="12" fill="#111827"/>
  <rect x="0" y="58" width="430" height="84" fill="#1a1a1a"/>
  <circle cx="42" cy="98" r="18" fill="${accent}"/>
  <text x="70" y="104" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="#f9fafb">SyncSafety</text>
  <rect x="24" y="126" width="72" height="24" rx="6" fill="${accent}"/>
  <rect x="104" y="126" width="78" height="24" rx="6" fill="#374151"/>
  <rect x="190" y="126" width="78" height="24" rx="6" fill="#374151"/>
  <rect x="276" y="126" width="72" height="24" rx="6" fill="#374151"/>
  <rect x="28" y="170" width="374" height="88" rx="12" fill="#ffffff" stroke="#d1d5db"/>
  <rect x="36" y="182" width="6" height="64" fill="${accent}"/>
  <text x="52" y="206" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700" fill="#111827">Compliance Alert: OSHA 300 posting window</text>
  <text x="52" y="230" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#6b7280">Verify totals and lock March incidents before export.</text>
  <rect x="300" y="206" width="84" height="28" rx="8" fill="${accent}" opacity="0.25"/>
  <text x="52" y="286" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="800" fill="#111827">Dashboard</text>
  <rect x="28" y="306" width="374" height="150" rx="14" fill="#ffffff" stroke="#d1d5db"/>
  <text x="48" y="336" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#111827">Safety Snapshot</text>
  <text x="48" y="358" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#6b7280">30-day proactive and incident status</text>
  <rect x="48" y="378" width="90" height="56" rx="10" fill="#f9fafb" stroke="#e5e7eb"/>
  <rect x="154" y="378" width="90" height="56" rx="10" fill="#f9fafb" stroke="#e5e7eb"/>
  <rect x="260" y="378" width="120" height="56" rx="10" fill="#f9fafb" stroke="#e5e7eb"/>
  <rect x="28" y="472" width="374" height="110" rx="14" fill="#ffffff" stroke="#d1d5db"/>
  <text x="48" y="504" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700" fill="#111827">Open incidents</text>
  <rect x="48" y="520" width="300" height="12" rx="6" fill="#e5e7eb"/>
  <rect x="48" y="520" width="190" height="12" rx="6" fill="${accent}"/>
  <rect x="28" y="610" width="374" height="88" rx="18" fill="#111827"/>
  <text x="215" y="662" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#f9fafb">Export OSHA 300 CSV</text>
</svg>`);
}

function studioPhoneMock(accent, secondary) {
  return Buffer.from(`<svg width="430" height="760" viewBox="0 0 430 760" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="414" height="744" rx="42" fill="#0f172a"/>
  <rect x="20" y="24" width="390" height="712" rx="34" fill="#f8fafc"/>
  <rect x="145" y="34" width="140" height="24" rx="12" fill="#0f172a"/>
  <rect x="0" y="58" width="430" height="72" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="28" y="78" width="28" height="28" rx="8" fill="${accent}"/>
  <text x="66" y="98" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="#0f172a">BringhurstDO Systems</text>
  <text x="28" y="168" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" fill="#0f172a">Platform Overview</text>
  <text x="28" y="194" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="600" fill="${accent}">ACTIVE PRODUCT LANES</text>
  <rect x="28" y="214" width="118" height="38" rx="19" fill="${accent}"/>
  <text x="87" y="238" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">SyncSOAP</text>
  <rect x="156" y="214" width="118" height="38" rx="19" fill="#ffffff" stroke="#dbe4ef"/>
  <text x="215" y="238" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">SyncSafety</text>
  <rect x="284" y="214" width="92" height="38" rx="19" fill="#ffffff" stroke="#dbe4ef"/>
  <text x="330" y="238" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Anki</text>
  <rect x="28" y="276" width="374" height="120" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="48" y="308" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#0f172a">Clinical documentation lane</text>
  <text x="48" y="332" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#64748b">Ambient scribe workflow, study tooling, vision support</text>
  <rect x="48" y="352" width="120" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="48" y="352" width="88" height="10" rx="5" fill="${accent}"/>
  <rect x="28" y="412" width="374" height="120" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="48" y="444" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#0f172a">Industrial safety lane</text>
  <text x="48" y="468" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#64748b">OSHA-aligned recordability, exports, and programs</text>
  <rect x="48" y="488" width="120" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="48" y="488" width="72" height="10" rx="5" fill="${secondary}"/>
  <rect x="28" y="548" width="374" height="120" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="48" y="580" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#0f172a">Learning systems lane</text>
  <text x="48" y="604" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#64748b">Open-source Anki tooling for COMLEX learners</text>
  <rect x="48" y="624" width="120" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="48" y="624" width="96" height="10" rx="5" fill="#94a3b8"/>
</svg>`);
}

function backgroundSvg(brand) {
  const features = brand.features
    .map((feature, index) => {
      const y = 250 + index * 168;

      return `<g transform="translate(1188, ${y})">
        ${featureIcon(index, brand.accent)}
        <text x="58" y="20" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="800" fill="${brand.accent}">${escapeXml(feature.title)}</text>
        <text x="58" y="48" font-family="Segoe UI, Arial, sans-serif" font-size="17" font-weight="500" fill="#64748b">${escapeXml(feature.body)}</text>
      </g>`;
    })
    .join("\n");

  return Buffer.from(`<svg width="${SIZE.width}" height="${SIZE.height}" viewBox="0 0 ${SIZE.width} ${SIZE.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#fbfdff"/>
      <stop offset="100%" stop-color="#f3f7fb"/>
    </linearGradient>
    <radialGradient id="accentWash" cx="88%" cy="18%" r="42%">
      <stop offset="0%" stop-color="${brand.accent}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${brand.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="hex" width="56" height="48" patternUnits="userSpaceOnUse">
      <path d="M28 2 L52 16 L52 32 L28 46 L4 32 L4 16 Z" fill="none" stroke="#cbd5e1" stroke-width="1" opacity="0.28"/>
    </pattern>
  </defs>
  <rect width="${SIZE.width}" height="${SIZE.height}" fill="url(#bg)"/>
  <rect width="${SIZE.width}" height="${SIZE.height}" fill="url(#accentWash)"/>
  <rect x="900" y="0" width="636" height="${SIZE.height}" fill="url(#hex)" opacity="0.55"/>

  <text x="72" y="150" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800">${brand.nameHtml}</text>
  <text x="72" y="188" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#64748b">${escapeXml(brand.tagline)}</text>

  <text x="72" y="286" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="#0f172a">${escapeXml(brand.titleMain)}</text>
  <text x="72" y="358" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="${brand.accent}">${escapeXml(brand.titleAccent)}</text>
  <rect x="72" y="390" width="84" height="5" rx="2.5" fill="${brand.accent}"/>
  <text x="72" y="442" font-family="Segoe UI, Arial, sans-serif" font-size="21" font-weight="500" fill="#64748b">${escapeXml(brand.subhead)}</text>

  <circle cx="98" cy="918" r="34" fill="${brand.badgeFill}"/>
  <text x="150" y="926" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" fill="${brand.accent}">${escapeXml(brand.trust)}</text>

  ${features}
</svg>`);
}

async function renderBrandCover(brand) {
  const [background, logo, mock] = await Promise.all([
    sharp(backgroundSvg(brand)).png().toBuffer(),
    rasterLogo(brand, 88),
    sharp(
      brand.mock === "safety"
        ? safetyPhoneMock(brand.accent)
        : studioPhoneMock(brand.accent, "#FFC107"),
    )
      .png()
      .toBuffer(),
  ]);

  const landscapePath = path.join(outDir, brand.outputs.landscape);

  await sharp(background)
    .composite([
      { input: logo, left: 72, top: 72 },
      { input: logo, left: 64, top: 884 },
      { input: mock, left: 610, top: 128 },
    ])
    .png()
    .toFile(landscapePath);

  const squarePath = path.join(outDir, brand.outputs.square);
  await sharp(landscapePath)
    .extract({ left: 228, top: 0, width: 1024, height: 1024 })
    .resize(1080, 1080)
    .png()
    .toFile(squarePath);

  const facebookPath = path.join(outDir, brand.outputs.facebook);
  await sharp(landscapePath)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .png()
    .toFile(facebookPath);

  return {
    facebookPath,
    landscapePath,
    squarePath,
  };
}

async function syncSyncSoapLandscape() {
  const source = path.join(
    root,
    "public",
    "ops-ig",
    "syncsoap-product-screenshot-base-icons-fixed.png",
  );
  const landscape = path.join(outDir, "syncsoap-product-cover-landscape.png");
  const square = path.join(outDir, "syncsoap-product-cover-square.png");
  const facebook = path.join(outDir, "syncsoap-product-cover-facebook.png");

  copyFileSync(source, landscape);

  await sharp(landscape)
    .extract({ left: 228, top: 0, width: 1024, height: 1024 })
    .resize(1080, 1080)
    .png()
    .toFile(square);

  await sharp(landscape)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .png()
    .toFile(facebook);

  return { facebook, landscape, square };
}

mkdirSync(outDir, { recursive: true });

const outputs = [];

for (const brand of Object.values(BRANDS)) {
  const rendered = await renderBrandCover(brand);
  outputs.push({ brand: brand.id, ...rendered });
  console.log(`Rendered ${brand.id}:`);
  console.log(`  ${rendered.landscapePath}`);
  console.log(`  ${rendered.squarePath}`);
  console.log(`  ${rendered.facebookPath}`);
}

const syncsoap = await syncSyncSoapLandscape();
outputs.push({ brand: "syncsoap", ...syncsoap });
console.log("Synced syncsoap landscape from base-icons-fixed:");
console.log(`  ${syncsoap.landscape}`);
console.log(`  ${syncsoap.square}`);
console.log(`  ${syncsoap.facebook}`);

writeFileSync(
  path.join(outDir, "product-cover-manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), outputs }, null, 2),
);

console.log("Product social cover renders complete.");
