import { NextResponse, type NextRequest } from "next/server";

import { fetchPublicImageBytes } from "@/lib/ops/ops-publish-media";
import { uploadOpsIgScreenshot } from "@/lib/ops/ops-media-upload";
import { renderSocialImageOverlay } from "@/lib/ops/social-image-overlay";
import type {
  OpsOverlayCrop,
  OpsOverlayFormat,
  OpsOverlayPreset,
  OpsOverlayTextScale,
  OpsProjectId,
} from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 60;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function projectId(value: unknown): OpsProjectId | null {
  return value === "syncsoap" || value === "syncsafety" || value === "bringhurstdo"
    ? value
    : null;
}

function option<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body." }, 400);
  }

  const project = projectId(payload.projectId);
  const headline = typeof payload.headline === "string" ? payload.headline.trim() : "";
  const assetLocation =
    typeof payload.assetLocation === "string" ? payload.assetLocation.trim() : "";
  const preset = option<OpsOverlayPreset>(
    payload.preset,
    ["editorial", "minimal", "centered", "quote", "event"],
    "editorial",
  );
  const format = option<OpsOverlayFormat>(
    payload.format,
    ["square", "portrait", "landscape"],
    "square",
  );
  const textScale = option<OpsOverlayTextScale>(
    payload.textScale,
    ["compact", "standard", "large"],
    "standard",
  );
  const crop = option<OpsOverlayCrop>(
    payload.crop,
    ["attention", "center", "top", "bottom", "left", "right"],
    "attention",
  );

  if (payload.confirmApproved !== true) {
    return jsonNoStore({ error: "Approve the overlay headline before rendering." }, 400);
  }
  if (!project || !assetLocation || !headline || headline.length > 90) {
    return jsonNoStore(
      { error: "projectId, source media, and an approved headline of 90 characters or fewer are required." },
      400,
    );
  }

  const sourceUrl = new URL(assetLocation, request.nextUrl.origin);
  const allowedHost =
    sourceUrl.host === request.nextUrl.host ||
    sourceUrl.hostname.endsWith(".public.blob.vercel-storage.com");

  if (sourceUrl.protocol !== "https:" && sourceUrl.origin !== request.nextUrl.origin) {
    return jsonNoStore({ error: "Overlay source media must use HTTPS." }, 400);
  }
  if (!allowedHost) {
    return jsonNoStore({ error: "Overlay source media must come from Ops media storage." }, 400);
  }

  try {
    const source = await fetchPublicImageBytes(sourceUrl.toString());
    const rendered = await renderSocialImageOverlay({
      bytes: source.bytes,
      crop,
      format,
      headline,
      preset,
      projectId: project,
      textScale,
    });
    const uploaded = await uploadOpsIgScreenshot({
      bytes: new Uint8Array(rendered),
      contentType: "image/jpeg",
      originalName: `overlay-${preset}-${format}-${Date.now()}.jpg`,
      projectId: project,
    });

    return jsonNoStore(uploaded);
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "Overlay render failed." },
      400,
    );
  }
}
