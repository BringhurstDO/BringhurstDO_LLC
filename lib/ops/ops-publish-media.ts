import "server-only";

import { resolveOpsPublicOrigin } from "@/lib/ops/ops-public-origin";
import type { OpsProjectId, PublicationPlatform } from "@/lib/ops/types";

const PROJECT_DEFAULT_ASSET: Partial<Record<OpsProjectId, string>> = {
  bringhurstdo: "/bringhurstdo-social-header.png",
  syncsafety: "/syncsafety-mock.jpg",
  syncsoap: "/ops-ig/syncsoap-product-screenshot.png",
};

const PLATFORM_ASSET_ALIASES: Partial<
  Record<PublicationPlatform, Record<string, string>>
> = {
  Facebook: {
    "/ops-ig/america-250-square.png": "/ops-ig/america-250-facebook.png",
  },
  LinkedIn: {
    "/ops-ig/america-250-square.png": "/ops-ig/america-250-facebook.png",
  },
};

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

export function platformPreferredAssetLocation(
  platform: PublicationPlatform | undefined,
  assetLocation: string | undefined,
) {
  const trimmed = assetLocation?.trim();

  if (!trimmed || !platform) {
    return trimmed;
  }

  return PLATFORM_ASSET_ALIASES[platform]?.[trimmed] ?? trimmed;
}

export function resolvePublishImageUrl(input: {
  accountId?: string;
  assetLocation?: string;
  imageUrl?: string;
  platform?: PublicationPlatform;
  publishingProjectId?: OpsProjectId;
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
  const preferredAsset = platformPreferredAssetLocation(
    input.platform,
    input.assetLocation,
  );
  const candidates = [
    input.imageUrl,
    preferredAsset,
    input.assetLocation,
    input.accountId ? envDefaults[input.accountId] : undefined,
    input.publishingProjectId ? envDefaults[input.publishingProjectId] : undefined,
    input.publishingProjectId
      ? PROJECT_DEFAULT_ASSET[input.publishingProjectId]
      : undefined,
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
