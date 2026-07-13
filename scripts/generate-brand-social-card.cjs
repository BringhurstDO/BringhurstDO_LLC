#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const FONT_STACK = "Segoe UI, Helvetica, Arial, sans-serif";

const LAYOUT_PRESETS = {
  square: {
    id: "square",
    width: 1080,
    height: 1080,
    platforms: "Instagram, Facebook feed",
    hex: { x: 620, width: 460, opacity: 0.55 },
    topBar: 12,
  },
  landscape: {
    id: "landscape",
    width: 1200,
    height: 630,
    platforms: "LinkedIn, X, Facebook link preview",
    hex: { x: 700, width: 500, opacity: 0.5 },
    topBar: 10,
  },
};

const BRAND_ALIASES = {
  bringhurstdo: "bringhurstdo",
  "bringhurst do": "bringhurstdo",
  bringhurst: "bringhurstdo",
  syncsoap: "syncsoap",
  syncsafety: "syncsafety",
  "kyle bringhurst": "kyle-bringhurst",
  "kyle-bringhurst": "kyle-bringhurst",
  kyle: "kyle-bringhurst",
};

const BRAND_PROFILES = {
  bringhurstdo: {
    id: "bringhurstdo",
    displayName: "BringhurstDO",
    productLine: "Healthcare & industrial venture studio",
    attribution: "bringhurstdo.com",
    primary: "#247D8A",
    ink: "#0f172a",
    muted: "#64748b",
    backgroundTop: "#f8fbfc",
    backgroundMid: "#ffffff",
    backgroundBottom: "#f3f7fb",
    accentWash: "#247D8A",
    markSvgPath: path.join(ROOT, "public", "Icon-BringhurstDOLLC.svg"),
    markViewBox: "300 80 1400 1600",
    stripTextFromMark: true,
    monogram: null,
  },
  syncsoap: {
    id: "syncsoap",
    displayName: "SyncSOAP",
    productLine: "AI medical documentation",
    attribution: "syncsoap.com",
    primary: "#00A3DA",
    ink: "#0f172a",
    muted: "#64748b",
    backgroundTop: "#f0f7fc",
    backgroundMid: "#fbfdff",
    backgroundBottom: "#ffffff",
    accentWash: "#00A3DA",
    markSvgPath: path.join(ROOT, "syncsoap-logo.svg"),
    markViewBox: null,
    stripTextFromMark: false,
    monogram: null,
  },
  syncsafety: {
    id: "syncsafety",
    displayName: "SyncSafety",
    productLine: "Safety workflows for modern teams",
    attribution: "bringhurstdo.com/syncsafety",
    primary: "#FFC107",
    ink: "#0f172a",
    muted: "#64748b",
    backgroundTop: "#fffdf5",
    backgroundMid: "#ffffff",
    backgroundBottom: "#fff8e1",
    accentWash: "#FFC107",
    markSvgPath: path.join(ROOT, "public", "syncsafety-logo.svg"),
    markViewBox: null,
    stripTextFromMark: false,
    monogram: null,
  },
  "kyle-bringhurst": {
    id: "kyle-bringhurst",
    displayName: "Kyle Bringhurst",
    productLine: "Founder notes & build in public",
    attribution: "BringhurstDO",
    primary: "#247D8A",
    ink: "#0f172a",
    muted: "#64748b",
    backgroundTop: "#f8fafc",
    backgroundMid: "#ffffff",
    backgroundBottom: "#f1f5f9",
    accentWash: "#247D8A",
    markSvgPath: null,
    markViewBox: null,
    stripTextFromMark: false,
    monogram: "KB",
  },
};

const BLOCKED_INPUT_PATTERNS = [
  /\bphi\b/i,
  /\bhipaa\b/i,
  /\bpatient\b/i,
  /\bencounter\b/i,
  /\bpassword\b/i,
  /\bapi[_ -]?key\b/i,
  /\bsecret\b/i,
  /\btoken\b/i,
  /\bcredential\b/i,
  /\bssn\b/i,
  /\bmrn\b/i,
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function parseArgs(argv) {
  const args = {};

  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);

    if (match) {
      args[match[1].toLowerCase()] = match[2];
    }
  }

  return args;
}

function normalizeBrand(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return null;
  }

  const key = trimmed.toLowerCase();
  return BRAND_ALIASES[key] ?? null;
}

function assertPublicSafeCopy(label, value) {
  const text = String(value ?? "").trim();

  for (const pattern of BLOCKED_INPUT_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(
        `${label} contains blocked content for public social cards. Use public-safe marketing language only.`,
      );
    }
  }

  return text;
}

function wrapText(value, maxChars) {
  const words = String(value).split(/\s+/).filter(Boolean);
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

function loadMarkInnerSvg(profile) {
  if (!profile.markSvgPath) {
    return null;
  }

  if (!fs.existsSync(profile.markSvgPath)) {
    throw new Error(`Missing canonical mark SVG for ${profile.displayName}: ${profile.markSvgPath}`);
  }

  let svg = fs.readFileSync(profile.markSvgPath, "utf8");
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, "").trim();

  if (profile.markViewBox) {
    if (/viewBox="[^"]*"/i.test(svg)) {
      svg = svg.replace(/viewBox="[^"]*"/i, `viewBox="${profile.markViewBox}"`);
    } else {
      svg = svg.replace(/<svg\b/i, `<svg viewBox="${profile.markViewBox}"`);
    }
  }

  if (profile.stripTextFromMark) {
    svg = svg.replace(/<text[\s\S]*?<\/text>/gi, "");
  }

  const openTagMatch = svg.match(/^<svg\b[^>]*>/i);

  if (!openTagMatch) {
    throw new Error(`Invalid mark SVG for ${profile.displayName}`);
  }

  const innerStart = openTagMatch.index + openTagMatch[0].length;
  const closeTagStart = svg.lastIndexOf("</svg>");

  if (closeTagStart === -1 || closeTagStart <= innerStart) {
    throw new Error(`Invalid mark SVG for ${profile.displayName}`);
  }

  return svg.slice(innerStart, closeTagStart).trim();
}

function markGroupMarkup(profile, { x, y, size, opacity = 1 }) {
  const inner = loadMarkInnerSvg(profile);

  if (inner) {
    const viewBox = profile.markViewBox ?? "0 0 100 100";

    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}" opacity="${opacity}" xmlns="http://www.w3.org/2000/svg">
  ${inner}
</svg>`;
  }

  if (profile.monogram) {
    const radius = size / 2;
    const centerX = x + radius;
    const centerY = y + radius;

    return `<g opacity="${opacity}">
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${profile.primary}" opacity="0.14"/>
  <circle cx="${centerX}" cy="${centerY}" r="${radius - 4}" fill="#ffffff" stroke="${profile.primary}" stroke-width="4"/>
  <text x="${centerX}" y="${centerY + Math.round(size * 0.12)}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${Math.round(size * 0.34)}" font-weight="800" fill="${profile.primary}">${escapeXml(profile.monogram)}</text>
</g>`;
  }

  return "";
}

function markFrameMarkup(profile, { x, y, frameSize, markSize, opacity = 1 }) {
  const markX = x + (frameSize - markSize) / 2;
  const markY = y + (frameSize - markSize) / 2;
  const radius = Math.round(frameSize * 0.2);

  return `<g opacity="${opacity}">
  <rect x="${x}" y="${y}" width="${frameSize}" height="${frameSize}" rx="${radius}" fill="#ffffff" stroke="${profile.primary}" stroke-opacity="0.2" stroke-width="2"/>
  <rect x="${x + 5}" y="${y + 5}" width="${frameSize - 10}" height="${frameSize - 10}" rx="${Math.max(radius - 4, 8)}" fill="${profile.primary}" opacity="0.07"/>
  ${markGroupMarkup(profile, { x: markX, y: markY, size: markSize, opacity: 1 })}
</g>`;
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

function kickerPillMarkup({ profile, centerX, y, fontSize, maxWidth }) {
  const label = profile.productLine.toUpperCase();
  const pillWidth = Math.min(maxWidth, Math.max(280, label.length * (fontSize * 0.56) + 48));
  const pillX = centerX - pillWidth / 2;
  const pillHeight = fontSize + 22;

  return `<rect x="${pillX}" y="${y - fontSize - 8}" width="${pillWidth}" height="${pillHeight}" rx="${Math.round(pillHeight / 2)}" fill="${profile.primary}" opacity="0.1"/>
  <text x="${centerX}" y="${y}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="800" fill="${profile.primary}" letter-spacing="1.4">${escapeXml(label)}</text>`;
}

function kickerPillLeftMarkup({ profile, x, y, fontSize }) {
  const label = profile.productLine.toUpperCase();
  const pillWidth = Math.min(520, Math.max(240, label.length * (fontSize * 0.56) + 40));
  const pillHeight = fontSize + 20;

  return `<rect x="${x}" y="${y - fontSize - 6}" width="${pillWidth}" height="${pillHeight}" rx="${Math.round(pillHeight / 2)}" fill="${profile.primary}" opacity="0.1"/>
  <text x="${x + 20}" y="${y}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="800" fill="${profile.primary}" letter-spacing="1.2">${escapeXml(label)}</text>`;
}

function computeSquareLayout({ title, subtitle, items, profile, preset }) {
  const width = preset.width;
  const height = preset.height;
  const centerX = width / 2;
  const footerTopY = height - 132;

  const titleFontSize =
    title.length > 52 ? 42 : title.length > 40 ? 48 : title.length > 30 ? 54 : 58;
  const titleChars =
    titleFontSize >= 54 ? 28 : titleFontSize >= 48 ? 32 : titleFontSize >= 42 ? 36 : 40;
  const titleLines = wrapText(title, titleChars);
  const titleLineHeight = Math.round(titleFontSize * 1.1);

  const subtitleFontSize = subtitle.length > 120 ? 24 : 27;
  const subtitleChars = subtitleFontSize === 24 ? 50 : 44;
  const subtitleLines = wrapText(subtitle, subtitleChars);
  const subtitleLineHeight = Math.round(subtitleFontSize * 1.3);

  const frameSize = 196;
  const markSize = 132;
  const kickerY = 82;
  const markY = 112;
  const titleStartY = markY + frameSize + 46;
  const ruleY = titleStartY + titleLines.length * titleLineHeight + 18;
  const subtitleStartY = ruleY + 30;

  const featureFontSize = 26;
  const featureLineHeight = 34;
  const featureGap = 16;
  const featureBlockWidth = 700;
  const maxFeatureLines = 2;

  const featureBlocks = items.slice(0, 4).map((item) => ({
    lines: wrapText(item, 38).slice(0, maxFeatureLines),
  }));

  const featuresHeight = featureBlocks.reduce((total, block, index) => {
    const blockHeight = Math.max(48, block.lines.length * featureLineHeight);
    const gap = index === 0 ? 0 : featureGap;
    return total + gap + blockHeight;
  }, 0);

  let featuresStartY = subtitleStartY + subtitleLines.length * subtitleLineHeight + 36;

  if (featuresStartY + featuresHeight > footerTopY - 20 && featureBlocks.length) {
    featuresStartY = Math.max(
      subtitleStartY + subtitleLines.length * subtitleLineHeight + 20,
      footerTopY - 20 - featuresHeight,
    );
  }

  return {
    centerX,
    featureBlocks,
    featureBlockWidth,
    featureFontSize,
    featureGap,
    featureLineHeight,
    featuresStartY,
    footerTopY,
    frameSize,
    height,
    kickerY,
    markSize,
    markY,
    mode: "square",
    preset,
    profile,
    ruleY,
    subtitleFontSize,
    subtitleLineHeight,
    subtitleLines,
    subtitleStartY,
    titleFontSize,
    titleLineHeight,
    titleLines,
    titleStartY,
    width,
  };
}

function computeLandscapeLayout({ title, subtitle, items, profile, preset }) {
  const width = preset.width;
  const height = preset.height;
  const leftX = 56;
  const footerTopY = height - 88;

  const titleFontSize =
    title.length > 48 ? 34 : title.length > 36 ? 40 : title.length > 28 ? 44 : 48;
  const titleChars = titleFontSize >= 44 ? 22 : titleFontSize >= 40 ? 26 : 30;
  const titleLines = wrapText(title, titleChars);
  const titleLineHeight = Math.round(titleFontSize * 1.08);

  const subtitleFontSize = subtitle.length > 110 ? 17 : 19;
  const subtitleChars = subtitleFontSize === 17 ? 42 : 36;
  const subtitleLines = wrapText(subtitle, subtitleChars);
  const subtitleLineHeight = Math.round(subtitleFontSize * 1.32);

  const frameSize = 108;
  const markSize = 74;
  const kickerY = 54;
  const markY = 78;
  const titleStartY = markY + frameSize + 34;
  const ruleY = titleStartY + titleLines.length * titleLineHeight + 14;
  const subtitleStartY = ruleY + 22;

  const featureFontSize = 19;
  const featureLineHeight = 26;
  const featureGap = 12;
  const featuresStartX = 652;
  const featuresStartY = 96;
  const maxFeatureLines = 2;

  const featureBlocks = items.slice(0, 4).map((item) => ({
    lines: wrapText(item, 28).slice(0, maxFeatureLines),
  }));

  return {
    featureBlocks,
    featureFontSize,
    featureGap,
    featureLineHeight,
    featuresStartX,
    featuresStartY,
    footerTopY,
    frameSize,
    height,
    kickerY,
    leftX,
    markSize,
    markY,
    mode: "landscape",
    preset,
    profile,
    ruleY,
    subtitleFontSize,
    subtitleLineHeight,
    subtitleLines,
    subtitleStartY,
    titleFontSize,
    titleLineHeight,
    titleLines,
    titleStartY,
    width,
  };
}

function computeLayout(input) {
  const preset = input.preset ?? LAYOUT_PRESETS.square;

  if (preset.id === "landscape") {
    return computeLandscapeLayout({ ...input, preset });
  }

  return computeSquareLayout({ ...input, preset });
}

function featuresMarkup(layout) {
  const parts = [];

  if (layout.mode === "landscape") {
    let y = layout.featuresStartY;

    for (const [index, block] of layout.featureBlocks.entries()) {
      const rowHeight = Math.max(48, block.lines.length * layout.featureLineHeight);

      parts.push(`<g data-reveal-item="${index}" transform="translate(${layout.featuresStartX}, ${y})">
  <svg width="48" height="48" viewBox="0 0 48 48">${featureIcon(index, layout.profile.primary)}</svg>
  ${block.lines
    .map(
      (line, lineIndex) =>
        `<text x="62" y="${22 + lineIndex * layout.featureLineHeight}" font-family="${FONT_STACK}" font-size="${layout.featureFontSize}" font-weight="600" fill="${layout.profile.ink}">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
</g>`);

      y += rowHeight + layout.featureGap;
    }

    return parts.join("\n  ");
  }

  let y = layout.featuresStartY;
  const blockX = layout.centerX - layout.featureBlockWidth / 2;

  for (const [index, block] of layout.featureBlocks.entries()) {
    const rowHeight = Math.max(48, block.lines.length * layout.featureLineHeight);

    parts.push(`<g data-reveal-item="${index}" transform="translate(${blockX}, ${y})">
  <svg width="48" height="48" viewBox="0 0 48 48">${featureIcon(index, layout.profile.primary)}</svg>
  ${block.lines
    .map(
      (line, lineIndex) =>
        `<text x="62" y="${24 + lineIndex * layout.featureLineHeight}" font-family="${FONT_STACK}" font-size="${layout.featureFontSize}" font-weight="600" fill="${layout.profile.ink}">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
</g>`);

    y += rowHeight + layout.featureGap;
  }

  return parts.join("\n  ");
}

function textLinesMarkup({
  x,
  y,
  lines,
  fontSize,
  lineHeight,
  fill,
  weight,
  anchor = "middle",
}) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join("\n  ");
}

function footerMarkup(layout) {
  const profile = layout.profile;
  const footerY = layout.footerTopY;
  const footerHeight = layout.height - footerY;
  const iconSize = layout.mode === "landscape" ? 38 : 44;
  const iconX = layout.mode === "landscape" ? 48 : 64;
  const iconY = footerY + Math.round((footerHeight - iconSize) / 2);
  const textX = iconX + iconSize + 16;
  const nameY = footerY + Math.round(footerHeight * 0.56);
  const urlY = nameY + (layout.mode === "landscape" ? 20 : 22);
  const nameSize = layout.mode === "landscape" ? 19 : 21;
  const urlSize = layout.mode === "landscape" ? 15 : 17;

  return `<rect x="0" y="${footerY}" width="${layout.width}" height="${footerHeight}" fill="#ffffff" opacity="0.9"/>
  <line x1="${layout.mode === "landscape" ? 48 : 64}" y1="${footerY}" x2="${layout.width - (layout.mode === "landscape" ? 48 : 64)}" y2="${footerY}" stroke="#e2e8f0" stroke-width="1.5"/>
  ${markGroupMarkup(profile, { x: iconX, y: iconY, size: iconSize, opacity: 0.96 })}
  <text x="${textX}" y="${nameY}" font-family="${FONT_STACK}" font-size="${nameSize}" font-weight="800" fill="${profile.ink}">${escapeXml(profile.displayName)}</text>
  <text x="${textX}" y="${urlY}" font-family="${FONT_STACK}" font-size="${urlSize}" font-weight="600" fill="${profile.muted}">${escapeXml(profile.attribution)}</text>`;
}

function buildSocialCardSvg({ profile, title, subtitle, items, preset }) {
  const layout = computeLayout({ title, subtitle, items, profile, preset });
  const { width, height } = layout;

  const headerMarkup =
    layout.mode === "landscape"
      ? `${kickerPillLeftMarkup({ profile, x: layout.leftX, y: layout.kickerY, fontSize: 14 })}
  ${markFrameMarkup(profile, {
    x: layout.leftX,
    y: layout.markY,
    frameSize: layout.frameSize,
    markSize: layout.markSize,
  })}
  ${textLinesMarkup({
    x: layout.leftX,
    y: layout.titleStartY,
    lines: layout.titleLines,
    fontSize: layout.titleFontSize,
    lineHeight: layout.titleLineHeight,
    fill: profile.ink,
    weight: 800,
    anchor: "start",
  })}
  <rect x="${layout.leftX}" y="${layout.ruleY}" width="72" height="5" rx="2.5" fill="${profile.primary}"/>
  ${textLinesMarkup({
    x: layout.leftX,
    y: layout.subtitleStartY,
    lines: layout.subtitleLines,
    fontSize: layout.subtitleFontSize,
    lineHeight: layout.subtitleLineHeight,
    fill: profile.muted,
    weight: 500,
    anchor: "start",
  })}`
      : `${kickerPillMarkup({ profile, centerX: layout.centerX, y: layout.kickerY, fontSize: 18, maxWidth: width - 120 })}
  ${markFrameMarkup(profile, {
    x: layout.centerX - layout.frameSize / 2,
    y: layout.markY,
    frameSize: layout.frameSize,
    markSize: layout.markSize,
  })}
  ${textLinesMarkup({
    x: layout.centerX,
    y: layout.titleStartY,
    lines: layout.titleLines,
    fontSize: layout.titleFontSize,
    lineHeight: layout.titleLineHeight,
    fill: profile.ink,
    weight: 800,
  })}
  <rect x="${layout.centerX - 42}" y="${layout.ruleY}" width="84" height="5" rx="2.5" fill="${profile.primary}"/>
  ${textLinesMarkup({
    x: layout.centerX,
    y: layout.subtitleStartY,
    lines: layout.subtitleLines,
    fontSize: layout.subtitleFontSize,
    lineHeight: layout.subtitleLineHeight,
    fill: profile.muted,
    weight: 500,
  })}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${profile.backgroundTop}"/>
      <stop offset="55%" stop-color="${profile.backgroundMid}"/>
      <stop offset="100%" stop-color="${profile.backgroundBottom}"/>
    </linearGradient>
    <radialGradient id="accentWash" cx="${layout.mode === "landscape" ? "88%" : "82%"}" cy="16%" r="42%">
      <stop offset="0%" stop-color="${profile.accentWash}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${profile.accentWash}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="hex" width="56" height="48" patternUnits="userSpaceOnUse">
      <path d="M28 2 L52 16 L52 32 L28 46 L4 32 L4 16 Z" fill="none" stroke="#cbd5e1" stroke-width="1" opacity="0.28"/>
    </pattern>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#accentWash)"/>
  <rect x="${preset.hex.x}" y="0" width="${preset.hex.width}" height="${height}" fill="url(#hex)" opacity="${preset.hex.opacity}"/>
  <rect width="${width}" height="${preset.topBar}" fill="${profile.primary}"/>

  ${headerMarkup}

  ${featuresMarkup(layout)}

  ${footerMarkup(layout)}
</svg>
`;
}

async function renderPngWithPlaywright(svgPath, pngPath, width, height) {
  let playwright;

  try {
    playwright = require("playwright");
  } catch {
    return false;
  }

  let browser;

  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 2,
    });

    const svg = fs.readFileSync(svgPath, "utf8");
    await page.setContent(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;}</style></head><body>${svg}</body></html>`,
      { waitUntil: "load" },
    );

    await page.screenshot({
      path: pngPath,
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });

    return true;
  } catch (error) {
    console.warn(`PNG render skipped: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function resolveOutputPaths(outValue, layoutId) {
  const trimmed = String(outValue ?? "").trim().replace(/\\/g, "/");

  if (!trimmed) {
    throw new Error("--out is required (example: --out=public/bringhurstdo-ops-social-card)");
  }

  const withoutExtension = trimmed.replace(/\.(svg|png)$/i, "");
  const suffix = layoutId === "landscape" ? "-landscape" : "";
  const absoluteBase = path.isAbsolute(withoutExtension)
    ? `${withoutExtension}${suffix}`
    : path.join(ROOT, `${withoutExtension}${suffix}`);

  return {
    layoutId,
    pngPath: `${absoluteBase}.png`,
    svgPath: `${absoluteBase}.svg`,
  };
}

function parseLayout(value) {
  const normalized = String(value ?? "square").trim().toLowerCase();

  if (normalized === "all") {
    return ["square", "landscape"];
  }

  if (normalized === "square" || normalized === "landscape") {
    return [normalized];
  }

  throw new Error(`Unknown --layout value "${value}". Use square, landscape, or all.`);
}

function parseItems(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const brandId = normalizeBrand(args.brand);

  if (!brandId) {
    throw new Error(
      `Unknown --brand value "${args.brand ?? ""}". Use BringhurstDO, SyncSOAP, SyncSafety, or Kyle Bringhurst.`,
    );
  }

  const profile = BRAND_PROFILES[brandId];
  const title = assertPublicSafeCopy("title", args.title);
  const subtitle = assertPublicSafeCopy("subtitle", args.subtitle);
  const items = parseItems(args.items).map((item, index) =>
    assertPublicSafeCopy(`items[${index}]`, item),
  );

  if (!title) {
    throw new Error("--title is required");
  }

  if (!subtitle) {
    throw new Error("--subtitle is required");
  }

  const layoutIds = parseLayout(args.layout);
  const outputs = [];

  for (const layoutId of layoutIds) {
    const preset = LAYOUT_PRESETS[layoutId];
    const { svgPath, pngPath } = resolveOutputPaths(args.out, layoutId);
    fs.mkdirSync(path.dirname(svgPath), { recursive: true });

    const svg = buildSocialCardSvg({ profile, title, subtitle, items, preset });
    fs.writeFileSync(svgPath, svg, "utf8");

    const pngRendered = await renderPngWithPlaywright(
      svgPath,
      pngPath,
      preset.width,
      preset.height,
    );

    outputs.push({
      layout: layoutId,
      platforms: preset.platforms,
      size: `${preset.width}x${preset.height}`,
      pngPath: pngRendered ? path.relative(ROOT, pngPath).replace(/\\/g, "/") : null,
      pngRendered,
      svgPath: path.relative(ROOT, svgPath).replace(/\\/g, "/"),
    });
  }

  const result = {
    brand: profile.displayName,
    items: items.length,
    outBase: args.out,
    outputs,
  };

  console.log(JSON.stringify(result, null, 2));

  if (outputs.some((entry) => !entry.pngRendered)) {
    console.log("SVG written successfully. Install Playwright Chromium to emit PNG.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
