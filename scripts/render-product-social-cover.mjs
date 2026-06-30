import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "ops-ig");
const manifestPath = path.join(outDir, "product-cover-manifest.json");

const OUTPUT_LAYOUTS = {
  landscape: {
    width: 1536,
    height: 1024,
    hex: { x: 900, width: 636 },
    logo: {
      iconX: 72,
      iconY: 72,
      iconSize: 72,
      textX: 152,
      textY: 135,
      textSize: 34,
      taglineY: 188,
      taglineSize: 20,
    },
    headline: {
      x: 72,
      y: 286,
      mainSize: 56,
      accentSize: 54,
      mainGap: 70,
      accentLineHeight: 60,
      ruleGap: 26,
      subheadGap: 50,
      subheadSize: 21,
      subheadChars: 48,
      subheadLineHeight: 30,
    },
    phone: { x: 610, y: 128, width: 430 },
    features: {
      x: 1188,
      y: 250,
      gap: 168,
      titleSize: 24,
      bodySize: 17,
      bodyChars: 32,
      bodyLineHeight: 23,
    },
    footer: {
      iconX: 64,
      iconY: 878,
      iconSize: 68,
      textX: 150,
      textY: 926,
      textSize: 20,
    },
  },
  square: {
    width: 1080,
    height: 1080,
    hex: { x: 650, width: 430 },
    logo: {
      iconX: 72,
      iconY: 70,
      iconSize: 68,
      textX: 148,
      textY: 129,
      textSize: 32,
      taglineY: 174,
      taglineSize: 19,
    },
    headline: {
      x: 72,
      y: 276,
      mainSize: 51,
      accentSize: 48,
      mainGap: 64,
      accentLineHeight: 54,
      ruleGap: 24,
      subheadGap: 48,
      subheadSize: 20,
      subheadChars: 34,
      subheadLineHeight: 29,
    },
    phone: { x: 586, y: 190, width: 420 },
    features: null,
    footer: {
      iconX: 72,
      iconY: 960,
      iconSize: 56,
      textX: 142,
      textY: 997,
      textSize: 18,
    },
  },
  facebook: {
    width: 1200,
    height: 630,
    hex: { x: 700, width: 500 },
    logo: {
      iconX: 56,
      iconY: 40,
      iconSize: 54,
      textX: 120,
      textY: 88,
      textSize: 26,
      taglineY: 126,
      taglineSize: 16,
    },
    headline: {
      x: 56,
      y: 214,
      mainSize: 42,
      accentSize: 40,
      mainGap: 52,
      accentLineHeight: 45,
      ruleGap: 18,
      subheadGap: 40,
      subheadSize: 16,
      subheadChars: 36,
      subheadLineHeight: 23,
    },
    phone: { x: 454, y: 20, width: 334 },
    features: {
      x: 846,
      y: 112,
      gap: 118,
      titleSize: 21,
      bodySize: 15,
      bodyChars: 30,
      bodyLineHeight: 20,
    },
    footer: {
      iconX: 56,
      iconY: 548,
      iconSize: 42,
      textX: 110,
      textY: 576,
      textSize: 16,
    },
  },
};

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
    titleAccentLines: ["Software handles", "the forms."],
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
    logoCrop: "300 80 1400 1600",
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
    titleAccentLines: ["We build the", "systems."],
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

function wrapText(value, maxChars) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function textLine({ color, fontSize, weight = 700, x, y, value }) {
  return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
}

function textBlock({
  color,
  fontSize,
  lineHeight,
  lines,
  weight = 500,
  x,
  y,
}) {
  return lines
    .map((line, index) =>
      textLine({
        color,
        fontSize,
        weight,
        x,
        y: y + index * lineHeight,
        value: line,
      }),
    )
    .join("\n");
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

function featureMarkup(brand, layout) {
  if (!layout.features) {
    return "";
  }

  return brand.features
    .map((feature, index) => {
      const y = layout.features.y + index * layout.features.gap;
      const bodyLines = wrapText(feature.body, layout.features.bodyChars);

      return `<g transform="translate(${layout.features.x}, ${y})">
        ${featureIcon(index, brand.accent)}
        ${textLine({
          color: brand.accent,
          fontSize: layout.features.titleSize,
          weight: 800,
          x: 58,
          y: 20,
          value: feature.title,
        })}
        ${textBlock({
          color: "#64748b",
          fontSize: layout.features.bodySize,
          lineHeight: layout.features.bodyLineHeight,
          lines: bodyLines,
          weight: 500,
          x: 58,
          y: 48,
        })}
      </g>`;
    })
    .join("\n");
}

function logoLockupMarkup(brand, layout) {
  return `<text x="${layout.logo.textX}" y="${layout.logo.textY}" font-family="Segoe UI, Arial, sans-serif" font-size="${layout.logo.textSize}" font-weight="800">${brand.nameHtml}</text>
  ${textLine({
    color: "#64748b",
    fontSize: layout.logo.taglineSize,
    weight: 600,
    x: layout.logo.textX,
    y: layout.logo.taglineY,
    value: brand.tagline,
  })}`;
}

function headlineMarkup(brand, layout) {
  const title = layout.headline;
  const accentLines = brand.titleAccentLines;
  const accentStartY = title.y + title.mainGap;
  const ruleY =
    accentStartY + accentLines.length * title.accentLineHeight + title.ruleGap;
  const subheadY = ruleY + title.subheadGap;
  const subheadLines = wrapText(brand.subhead, title.subheadChars);

  return `${textLine({
    color: "#0f172a",
    fontSize: title.mainSize,
    weight: 800,
    x: title.x,
    y: title.y,
    value: brand.titleMain,
  })}
  ${textBlock({
    color: brand.accent,
    fontSize: title.accentSize,
    lineHeight: title.accentLineHeight,
    lines: accentLines,
    weight: 800,
    x: title.x,
    y: accentStartY,
  })}
  <rect x="${title.x}" y="${ruleY}" width="84" height="5" rx="2.5" fill="${brand.accent}"/>
  ${textBlock({
    color: "#64748b",
    fontSize: title.subheadSize,
    lineHeight: title.subheadLineHeight,
    lines: subheadLines,
    weight: 500,
    x: title.x,
    y: subheadY,
  })}`;
}

function footerMarkup(brand, layout) {
  return textLine({
    color: brand.accent,
    fontSize: layout.footer.textSize,
    weight: 800,
    x: layout.footer.textX,
    y: layout.footer.textY,
    value: brand.trust,
  });
}

function backgroundSvg(brand, layout) {
  return Buffer.from(`<svg width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="58%" stop-color="#fbfdff"/>
      <stop offset="100%" stop-color="#f3f7fb"/>
    </linearGradient>
    <radialGradient id="accentWash" cx="88%" cy="18%" r="42%">
      <stop offset="0%" stop-color="${brand.accent}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${brand.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="hex" width="56" height="48" patternUnits="userSpaceOnUse">
      <path d="M28 2 L52 16 L52 32 L28 46 L4 32 L4 16 Z" fill="none" stroke="#cbd5e1" stroke-width="1" opacity="0.28"/>
    </pattern>
  </defs>
  <rect width="${layout.width}" height="${layout.height}" fill="url(#bg)"/>
  <rect width="${layout.width}" height="${layout.height}" fill="url(#accentWash)"/>
  <rect x="${layout.hex.x}" y="0" width="${layout.hex.width}" height="${layout.height}" fill="url(#hex)" opacity="0.55"/>
  ${logoLockupMarkup(brand, layout)}
  ${headlineMarkup(brand, layout)}
  ${footerMarkup(brand, layout)}
  ${featureMarkup(brand, layout)}
</svg>`);
}

function mockForBrand(brand) {
  return brand.mock === "safety"
    ? safetyPhoneMock(brand.accent)
    : studioPhoneMock(brand.accent, "#FFC107");
}

async function resizedPng(buffer, width) {
  return sharp(buffer).resize({ width }).png().toBuffer();
}

async function renderBrandVariant(brand, variant, layout, logo, footerLogo, mock) {
  const background = await sharp(backgroundSvg(brand, layout)).png().toBuffer();
  const phone = await resizedPng(mock, layout.phone.width);
  const outputPath = path.join(outDir, brand.outputs[variant]);

  await sharp(background)
    .composite([
      {
        input: await resizedPng(logo, layout.logo.iconSize),
        left: layout.logo.iconX,
        top: layout.logo.iconY,
      },
      {
        input: phone,
        left: layout.phone.x,
        top: layout.phone.y,
      },
      {
        input: await resizedPng(footerLogo, layout.footer.iconSize),
        left: layout.footer.iconX,
        top: layout.footer.iconY,
      },
    ])
    .png()
    .toFile(outputPath);

  return outputPath;
}

async function renderBrandCover(brand) {
  const [logo, footerLogo] = await Promise.all([
    rasterLogo(brand, 120),
    rasterLogo(brand, 120),
  ]);
  const mock = mockForBrand(brand);
  const outputs = {};

  for (const [variant, layout] of Object.entries(OUTPUT_LAYOUTS)) {
    outputs[`${variant}Path`] = await renderBrandVariant(
      brand,
      variant,
      layout,
      logo,
      footerLogo,
      mock,
    );
  }

  return outputs;
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

function readManifestOutputs() {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));

    if (Array.isArray(parsed.outputs)) {
      return parsed.outputs;
    }
  } catch {
    // Missing or invalid generated metadata should not block image rendering.
  }

  return [];
}

function writeMergedManifest(renderedOutputs) {
  const outputByBrand = new Map();

  for (const output of readManifestOutputs()) {
    if (output && typeof output.brand === "string") {
      outputByBrand.set(output.brand, output);
    }
  }

  for (const output of renderedOutputs) {
    outputByBrand.set(output.brand, output);
  }

  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        outputs: Array.from(outputByBrand.values()),
      },
      null,
      2,
    ),
  );
}

const requested = new Set(
  process.argv
    .slice(2)
    .map((value) => value.toLowerCase())
    .filter(Boolean),
);
const renderAll = requested.size === 0;

mkdirSync(outDir, { recursive: true });

const outputs = [];

for (const brand of Object.values(BRANDS)) {
  if (!renderAll && !requested.has(brand.id)) {
    continue;
  }

  const rendered = await renderBrandCover(brand);
  outputs.push({ brand: brand.id, ...rendered });
  console.log(`Rendered ${brand.id}:`);
  console.log(`  ${rendered.landscapePath}`);
  console.log(`  ${rendered.squarePath}`);
  console.log(`  ${rendered.facebookPath}`);
}

if (renderAll || requested.has("syncsoap")) {
  const syncsoap = await syncSyncSoapLandscape();
  outputs.push({ brand: "syncsoap", ...syncsoap });
  console.log("Synced syncsoap landscape from base-icons-fixed:");
  console.log(`  ${syncsoap.landscape}`);
  console.log(`  ${syncsoap.square}`);
  console.log(`  ${syncsoap.facebook}`);
}

writeMergedManifest(outputs);

console.log("Product social cover renders complete.");
