import sharp from "sharp";

import type {
  OpsOverlayCrop,
  OpsOverlayFormat,
  OpsOverlayPreset,
  OpsOverlayTextScale,
  OpsProjectId,
} from "@/lib/ops/types";

const palette: Record<OpsProjectId, { accent: string; brand: string }> = {
  bringhurstdo: { accent: "#238696", brand: "BringhurstDO" },
  syncsafety: { accent: "#ffbd0a", brand: "SyncSafety" },
  syncsoap: { accent: "#16a6d9", brand: "SyncSOAP" },
};

export const overlayPresets: Array<{
  id: OpsOverlayPreset;
  label: string;
  description: string;
}> = [
  { id: "editorial", label: "Editorial", description: "Bold lower-third headline" },
  { id: "minimal", label: "Minimal", description: "Compact top-left treatment" },
  { id: "centered", label: "Centered", description: "Centered announcement panel" },
  { id: "quote", label: "Quote", description: "Light editorial quotation" },
  { id: "event", label: "Event", description: "High-contrast conference banner" },
];

export const overlayFormats: Record<
  OpsOverlayFormat,
  { height: number; width: number }
> = {
  landscape: { height: 630, width: 1200 },
  portrait: { height: 1350, width: 1080 },
  square: { height: 1080, width: 1080 },
};

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function scaleValue(scale: OpsOverlayTextScale) {
  return scale === "compact" ? 0.82 : scale === "large" ? 1.16 : 1;
}

function wrapHeadline(value: string, maxCharacters: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const current = lines.at(-1) ?? "";
    if (!current || `${current} ${word}`.length > maxCharacters) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  if (lines.length > maxLines) {
    const retained = lines.slice(0, maxLines);
    retained[maxLines - 1] = `${retained[maxLines - 1]!.replace(/[.]+$/, "")}...`;
    return retained;
  }

  return lines;
}

function textLines(input: {
  anchor: "middle" | "start";
  color: string;
  fontFamily: string;
  fontSize: number;
  fontStyle?: string;
  fontWeight: number;
  lines: string[];
  lineHeight: number;
  x: number;
  y: number;
}) {
  return input.lines
    .map(
      (line, index) =>
        `<text x="${input.x}" y="${input.y + index * input.lineHeight}" text-anchor="${input.anchor}" fill="${input.color}" font-family="${input.fontFamily}" font-size="${input.fontSize}" font-style="${input.fontStyle ?? "normal"}" font-weight="${input.fontWeight}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function overlaySvg(input: {
  format: OpsOverlayFormat;
  headline: string;
  preset: OpsOverlayPreset;
  projectId: OpsProjectId;
  textScale: OpsOverlayTextScale;
}) {
  const { height, width } = overlayFormats[input.format];
  const style = palette[input.projectId];
  const factor = scaleValue(input.textScale);
  const margin = Math.round(width * 0.065);
  const baseFont = Math.round(Math.min(width, height) * 0.057 * factor);
  const brandSize = Math.round(Math.min(width, height) * 0.028);
  const maxCharacters = Math.max(15, Math.round((width / baseFont) * 1.55));
  const lines = wrapHeadline(input.headline.slice(0, 90), maxCharacters, 3);

  if (input.preset === "minimal") {
    const panelHeight = Math.round(height * 0.25);
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${margin}" y="${margin}" width="${Math.round(width * 0.66)}" height="${panelHeight}" rx="8" fill="#0f172a" fill-opacity="0.82"/>
      <rect x="${margin}" y="${margin}" width="10" height="${panelHeight}" fill="${style.accent}"/>
      ${textLines({ anchor: "start", color: "#ffffff", fontFamily: "Arial, sans-serif", fontSize: Math.round(baseFont * 0.72), fontWeight: 700, lines, lineHeight: Math.round(baseFont * 0.92), x: margin + 34, y: margin + Math.round(baseFont * 0.9) })}
      <text x="${margin + 34}" y="${margin + panelHeight - 24}" fill="${style.accent}" font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700">${style.brand}</text>
    </svg>`;
  }

  if (input.preset === "centered") {
    const panelY = Math.round(height * 0.28);
    const panelHeight = Math.round(height * 0.44);
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${margin}" y="${panelY}" width="${width - margin * 2}" height="${panelHeight}" rx="8" fill="#0f172a" fill-opacity="0.86"/>
      <rect x="${Math.round(width * 0.36)}" y="${panelY + 34}" width="${Math.round(width * 0.28)}" height="8" fill="${style.accent}"/>
      ${textLines({ anchor: "middle", color: "#ffffff", fontFamily: "Georgia, serif", fontSize: Math.round(baseFont * 0.9), fontWeight: 700, lines, lineHeight: Math.round(baseFont * 1.16), x: width / 2, y: panelY + Math.round(panelHeight * 0.42) })}
      <text x="${width / 2}" y="${panelY + panelHeight - 34}" text-anchor="middle" fill="${style.accent}" font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700">${style.brand}</text>
    </svg>`;
  }

  if (input.preset === "quote") {
    const panelY = Math.round(height * 0.52);
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${panelY}" width="${width}" height="${height - panelY}" fill="#ffffff" fill-opacity="0.9"/>
      <text x="${margin}" y="${panelY + 86}" fill="${style.accent}" font-family="Georgia, serif" font-size="92" font-weight="700">&#8220;</text>
      ${textLines({ anchor: "start", color: "#0f172a", fontFamily: "Georgia, serif", fontSize: Math.round(baseFont * 0.8), fontStyle: "italic", fontWeight: 600, lines, lineHeight: Math.round(baseFont * 1.05), x: margin + 62, y: panelY + 92 })}
      <text x="${margin + 62}" y="${height - 38}" fill="${style.accent}" font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700">${style.brand}</text>
    </svg>`;
  }

  if (input.preset === "event") {
    const panelHeight = Math.round(height * 0.34);
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${panelHeight}" fill="#0f172a" fill-opacity="0.94"/>
      <rect x="0" y="${panelHeight - 14}" width="${width}" height="14" fill="${style.accent}"/>
      <text x="${margin}" y="${Math.round(panelHeight * 0.23)}" fill="${style.accent}" font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700">${style.brand} - EVENT</text>
      ${textLines({ anchor: "start", color: "#ffffff", fontFamily: "Arial, sans-serif", fontSize: Math.round(baseFont * 0.88), fontWeight: 800, lines, lineHeight: Math.round(baseFont * 1.04), x: margin, y: Math.round(panelHeight * 0.52) })}
    </svg>`;
  }

  const panelY = Math.round(height * 0.64);
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${panelY}" width="${width}" height="${height - panelY}" fill="#0f172a" fill-opacity="0.92"/>
    <rect x="0" y="${panelY}" width="18" height="${height - panelY}" fill="${style.accent}"/>
    ${textLines({ anchor: "start", color: "#ffffff", fontFamily: "Arial, sans-serif", fontSize: baseFont, fontWeight: 700, lines, lineHeight: Math.round(baseFont * 1.24), x: margin, y: panelY + Math.round(baseFont * 1.08) })}
    <text x="${margin}" y="${height - 38}" fill="${style.accent}" font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700">${style.brand}</text>
  </svg>`;
}

export async function renderSocialImageOverlay(input: {
  bytes: Uint8Array;
  crop?: OpsOverlayCrop;
  format?: OpsOverlayFormat;
  headline: string;
  preset?: OpsOverlayPreset;
  projectId: OpsProjectId;
  textScale?: OpsOverlayTextScale;
}) {
  const format = input.format ?? "square";
  const dimensions = overlayFormats[format];
  const svg = Buffer.from(
    overlaySvg({
      format,
      headline: input.headline,
      preset: input.preset ?? "editorial",
      projectId: input.projectId,
      textScale: input.textScale ?? "standard",
    }),
  );

  return sharp(Buffer.from(input.bytes))
    .rotate()
    .resize(dimensions.width, dimensions.height, {
      fit: "cover",
      position: input.crop ?? "attention",
    })
    .composite([{ input: svg }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
