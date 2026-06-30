import "server-only";

import { resolveOpsPublicOrigin } from "@/lib/ops/ops-public-origin";
import { listOpsIgMediaCatalog } from "@/lib/ops/ops-ig-media-catalog";
import { resolveDefaultAssetLocation } from "@/lib/ops/social-default-image";
import type { OpsProjectId, PublicationPlatform } from "@/lib/ops/types";

function parseDefaultImagesFromEnv() {
  const raw = process.env.META_INSTAGRAM_DEFAULT_IMAGES?.trim();

  if (!raw) {
    return {} as Record<string, string>;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as Record<string, string>;
    }

    const entries: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) {
        entries[key.trim()] = value.trim();
      }
    }

    return entries;
  } catch {
    return {} as Record<string, string>;
  }
}

function toAbsolutePublicUrl(origin: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }

  return null;
}

export { platformPreferredAssetLocation } from "@/lib/ops/social-default-image";

export function resolvePublishImageUrl(input: {
  accountId?: string;
  assetLocation?: string;
  body?: string;
  imageUrl?: string;
  platform?: PublicationPlatform;
  publishingProjectId?: OpsProjectId;
  sourceProjectId?: OpsProjectId;
  title?: string;
}):
  | { ok: true; imageUrl: string }
  | { ok: false; reason: string } {
  const origin = resolveOpsPublicOrigin();

  if (!origin) {
    return {
      ok: false,
      reason:
        "Public site origin is not configured. Set META_REDIRECT_URI or OPS_PUBLIC_ORIGIN.",
    };
  }

  const envDefaults = parseDefaultImagesFromEnv();
  const catalogEntries = listOpsIgMediaCatalog();
  const resolvedAsset = resolveDefaultAssetLocation({
    accountId: input.accountId,
    assetLocation: input.assetLocation,
    body: input.body,
    catalogEntries,
    envDefaults,
    platform: input.platform,
    publishingProjectId: input.publishingProjectId,
    sourceProjectId: input.sourceProjectId,
    title: input.title,
  });

  const candidates = [
    input.imageUrl,
    resolvedAsset,
    process.env.META_INSTAGRAM_DEFAULT_IMAGE_URL?.trim(),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const absolute = toAbsolutePublicUrl(origin, candidate);

    if (absolute?.startsWith("https://")) {
      return { ok: true, imageUrl: absolute };
    }
  }

  const platformLabel = input.platform ?? "This platform";

  return {
    ok: false,
    reason: `${platformLabel} requires a public HTTPS image. Attach a social image on the package builder or calendar, pick an approved catalog image, or configure brand default images.`,
  };
}

export async function fetchPublicImageBytes(imageUrl: string) {
  const response = await fetch(imageUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not fetch publish image (${response.status}).`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();

  if (!contentType?.startsWith("image/")) {
    throw new Error("Publish image URL did not return an image content type.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.length === 0) {
    throw new Error("Publish image was empty.");
  }

  if (bytes.length > 8 * 1024 * 1024) {
    throw new Error("Publish image exceeds the 8 MB Ops limit.");
  }

  return { bytes, contentType };
}

export { platformSupportsSocialImage } from "@/lib/ops/social-image-utils";
