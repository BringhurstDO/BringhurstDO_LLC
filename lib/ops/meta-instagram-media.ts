import "server-only";

import { resolveOpsPublicOrigin } from "@/lib/ops/ops-public-origin";
import type { OpsProjectId } from "@/lib/ops/types";

const PROJECT_DEFAULT_ASSET: Partial<Record<OpsProjectId, string>> = {
  bringhurstdo: "/bringhurstdo-social-header.png",
  syncsafety: "/syncsafety-mock.jpg",
  syncsoap: "/bringhurstdo-social-header.png",
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

export function resolveInstagramPublishImageUrl(input: {
  accountId?: string;
  assetLocation?: string;
  imageUrl?: string;
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
  const candidates = [
    input.imageUrl,
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

  return {
    ok: false,
    reason:
      "Instagram requires a public HTTPS image. Set draft media assetLocation to a site path (for example /bringhurstdo-social-header.png), or configure META_INSTAGRAM_DEFAULT_IMAGES.",
  };
}
