import "server-only";

import { resolveOpsPublicOrigin } from "@/lib/ops/ops-public-origin";
import { listOpsIgMediaCatalog } from "@/lib/ops/ops-ig-media-catalog";
import {
  classifyPublishMediaKind,
  maxFetchBytesForMediaKind,
  type OpsPublishMediaKind,
} from "@/lib/ops/ops-media-kind";
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
    reason: `${platformLabel} requires a public HTTPS media URL. Attach a social image, GIF, or MP4 on the package builder or calendar, pick an approved catalog image, or configure brand default images.`,
  };
}

export async function fetchPublicMediaBytes(mediaUrl: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
  kind: OpsPublishMediaKind;
}> {
  const response = await fetch(mediaUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not fetch publish media (${response.status}).`);
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    "application/octet-stream";
  const kind = classifyPublishMediaKind({ contentType, url: mediaUrl });

  if (
    !contentType.startsWith("image/") &&
    contentType !== "video/mp4" &&
    !contentType.startsWith("video/")
  ) {
    throw new Error(
      "Publish media URL did not return an image or MP4 content type.",
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.length === 0) {
    throw new Error("Publish media was empty.");
  }

  const maxBytes = maxFetchBytesForMediaKind(kind);

  if (bytes.length > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Publish media exceeds the ${limitMb} MB Ops limit.`);
  }

  return { bytes, contentType, kind };
}

/** @deprecated Prefer fetchPublicMediaBytes — kept for existing image-only callers. */
export async function fetchPublicImageBytes(imageUrl: string) {
  const media = await fetchPublicMediaBytes(imageUrl);

  if (media.kind === "video") {
    throw new Error("Publish image URL returned video content. Use MP4 video publish path.");
  }

  return { bytes: media.bytes, contentType: media.contentType };
}

export { platformSupportsSocialImage } from "@/lib/ops/social-image-utils";
export {
  classifyPublishMediaKind,
  mediaTypeFromAssetLocation,
} from "@/lib/ops/ops-media-kind";
