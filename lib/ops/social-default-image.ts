import type { OpsProjectId, PublicationPlatform } from "@/lib/ops/types";

import {
  resolveSuggestedCatalogEntryForProject,
} from "@/lib/ops/social-media-suggest";

export type SocialCatalogEntry = {
  assetLocation: string;
  id: string;
  label: string;
  projectId: OpsProjectId;
  tags?: string[];
};

export const PLATFORM_ASSET_ALIASES: Partial<
  Record<PublicationPlatform, Record<string, string>>
> = {
  Facebook: {
    "/ops-ig/america-250-square.png": "/ops-ig/america-250-facebook.png",
    "/ops-ig/syncsoap-progress-ig-01-cover.png":
      "/ops-ig/syncsoap-product-screenshot-ig-square.png",
  },
  LinkedIn: {
    "/ops-ig/america-250-square.png": "/ops-ig/america-250-facebook.png",
    "/ops-ig/syncsoap-progress-ig-01-cover.png":
      "/ops-ig/syncsoap-product-screenshot-ig-square.png",
  },
};

export const PROJECT_PLATFORM_DEFAULTS: Partial<
  Record<OpsProjectId, Partial<Record<PublicationPlatform | "default", string>>>
> = {
  bringhurstdo: {
    default: "/bringhurstdo-social-header.png",
    Facebook: "/bringhurstdo-social-header.png",
    Instagram: "/bringhurstdo-social-header.png",
    LinkedIn: "/bringhurstdo-social-header.png",
    X: "/bringhurstdo-social-header.png",
  },
  syncsafety: {
    default: "/syncsafety-mock.jpg",
    Facebook: "/syncsafety-mock.jpg",
    Instagram: "/syncsafety-mock.jpg",
    LinkedIn: "/syncsafety-mock.jpg",
    X: "/syncsafety-mock.jpg",
  },
  syncsoap: {
    default: "/ops-ig/syncsoap-product-screenshot-ig-square.png",
    Facebook: "/ops-ig/syncsoap-product-screenshot-ig-square.png",
    Instagram: "/ops-ig/syncsoap-product-screenshot-ig-square.png",
    LinkedIn: "/ops-ig/syncsoap-product-screenshot-ig-square.png",
    X: "/ops-ig/syncsoap-product-screenshot-ig-square.png",
  },
};

const CONTENT_PROJECT_PATTERNS: Array<{
  projectId: OpsProjectId;
  patterns: RegExp[];
}> = [
  {
    projectId: "syncsoap",
    patterns: [/syncsoap/i, /ambient scribe/i, /ai scribe/i, /soap note/i],
  },
  {
    projectId: "syncsafety",
    patterns: [/syncsafety/i, /safety workflow/i, /\behs\b/i],
  },
  {
    projectId: "bringhurstdo",
    patterns: [/bringhurstdo/i, /build in public/i, /operator note/i],
  },
];

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

export function inferContentProjectId(title: string, body: string) {
  const haystack = `${title}\n${body}`.trim();

  if (!haystack) {
    return null;
  }

  for (const rule of CONTENT_PROJECT_PATTERNS) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.projectId;
    }
  }

  return null;
}

export function resolveProjectDefaultCatalogEntry(
  entries: SocialCatalogEntry[],
  projectId: OpsProjectId,
  platform?: PublicationPlatform,
) {
  const projectEntries = entries.filter((entry) => entry.projectId === projectId);

  if (!projectEntries.length) {
    return null;
  }

  if (platform === "LinkedIn" || platform === "Facebook") {
    const landscape = projectEntries.find(
      (entry) =>
        entry.tags?.includes("facebook") ||
        entry.assetLocation.includes("facebook"),
    );

    if (landscape) {
      return landscape;
    }
  }

  if (platform === "Instagram") {
    const square = projectEntries.find(
      (entry) =>
        entry.tags?.includes("instagram") &&
        (entry.id.includes("square") ||
          entry.id.includes("product") ||
          entry.id.includes("progress")),
    );

    if (square) {
      return square;
    }
  }

  const product = projectEntries.find(
    (entry) =>
      entry.tags?.includes("product") ||
      entry.id.includes("product") ||
      entry.id.includes("screenshot") ||
      entry.id.includes("mock"),
  );

  if (product) {
    return product;
  }

  const progressCover = projectEntries.find((entry) =>
    entry.id.includes("progress-ig-01-cover"),
  );

  if (progressCover) {
    return progressCover;
  }

  return projectEntries[0] ?? null;
}

function resolveConfiguredProjectDefault(
  projectId: OpsProjectId,
  platform?: PublicationPlatform,
) {
  const configured = PROJECT_PLATFORM_DEFAULTS[projectId];

  if (!configured) {
    return null;
  }

  if (platform && configured[platform]) {
    return configured[platform] ?? null;
  }

  return configured.default ?? null;
}

export function resolveDefaultAssetLocation(input: {
  accountId?: string;
  assetLocation?: string;
  body?: string;
  catalogEntries?: SocialCatalogEntry[];
  envDefaults?: Record<string, string>;
  platform?: PublicationPlatform;
  publishingProjectId?: OpsProjectId;
  sourceProjectId?: OpsProjectId;
  title?: string;
}) {
  const explicit = input.assetLocation?.trim();

  if (explicit) {
    return platformPreferredAssetLocation(input.platform, explicit);
  }

  const title = input.title?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const inferredProjectId = inferContentProjectId(title, body);
  const contentProjectId =
    input.sourceProjectId ?? inferredProjectId ?? undefined;

  if (title || body) {
    const catalogMatch = resolveSuggestedCatalogEntryForProject(
      input.catalogEntries ?? [],
      title,
      body,
      contentProjectId,
    );

    if (catalogMatch?.assetLocation) {
      return platformPreferredAssetLocation(
        input.platform,
        catalogMatch.assetLocation,
      );
    }
  }

  if (contentProjectId && input.catalogEntries?.length) {
    const projectCatalogDefault = resolveProjectDefaultCatalogEntry(
      input.catalogEntries,
      contentProjectId,
      input.platform,
    );

    if (projectCatalogDefault?.assetLocation) {
      return platformPreferredAssetLocation(
        input.platform,
        projectCatalogDefault.assetLocation,
      );
    }
  }

  for (const projectId of uniqueProjects([
    contentProjectId,
    inferredProjectId,
    input.sourceProjectId,
  ])) {
    const configured = resolveConfiguredProjectDefault(projectId, input.platform);

    if (configured) {
      return configured;
    }
  }

  const envDefaults = input.envDefaults ?? {};

  for (const key of uniqueEnvKeys([
    contentProjectId,
    input.sourceProjectId,
    inferredProjectId,
    input.publishingProjectId,
    input.accountId,
  ])) {
    const envDefault = key ? envDefaults[key]?.trim() : undefined;

    if (envDefault) {
      return platformPreferredAssetLocation(input.platform, envDefault);
    }
  }

  return undefined;
}

function uniqueProjects(values: Array<OpsProjectId | null | undefined>) {
  const seen = new Set<OpsProjectId>();
  const ordered: OpsProjectId[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    ordered.push(value);
  }

  return ordered;
}

function uniqueEnvKeys(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    ordered.push(trimmed);
  }

  return ordered;
}

export function describeDefaultAssetResolution(input: {
  assetLocation?: string;
  body?: string;
  catalogEntries?: SocialCatalogEntry[];
  platform?: PublicationPlatform;
  publishingProjectId?: OpsProjectId;
  sourceProjectId?: OpsProjectId;
  title?: string;
}) {
  const resolved = resolveDefaultAssetLocation(input);
  const inferredProjectId = inferContentProjectId(
    input.title?.trim() ?? "",
    input.body?.trim() ?? "",
  );

  return {
    contentProjectId: input.sourceProjectId ?? inferredProjectId ?? null,
    inferredProjectId,
    publishingProjectId: input.publishingProjectId ?? null,
    resolvedAssetLocation: resolved ?? null,
    sourceProjectId: input.sourceProjectId ?? null,
  };
}
