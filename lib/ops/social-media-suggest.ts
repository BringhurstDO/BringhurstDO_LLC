import { shouldAutoAttachCatalogImage } from "@/lib/ops/social-image-utils";
import { resolveProjectDefaultCatalogEntry } from "@/lib/ops/social-default-image";
import type { OpsProjectId, SourceUpdateType } from "@/lib/ops/types";

export type SocialCatalogHint = {
  catalogIds: string[];
  label: string;
  patterns: RegExp[];
};

/** Keyword rules for matching source copy to approved catalog assets. */
export const SOCIAL_CATALOG_HINTS: SocialCatalogHint[] = [
  {
    catalogIds: ["america-250-square", "america-250-facebook"],
    label: "America 250",
    patterns: [
      /america\s*250/i,
      /250th/i,
      /1776-?2026/i,
      /celebrating america/i,
    ],
  },
  {
    catalogIds: ["syncsoap-progress-ig-01-cover"],
    label: "SyncSOAP progress carousel",
    patterns: [
      /development progress/i,
      /pilot-ready/i,
      /pilot ready/i,
      /study workflow/i,
      /lesion-description/i,
      /lesion description/i,
      /model governance/i,
      /evidence bundle/i,
      /hipaa-aligned/i,
      /syncsoap.*update/i,
      /syncsoap.*progress/i,
    ],
  },
  {
    catalogIds: ["syncsoap-product-screenshot", "syncsoap-product-screenshot-ig-square"],
    label: "SyncSOAP product screenshot",
    patterns: [
      /ambient scribe/i,
      /ai scribe/i,
      /provider dashboard/i,
      /syncsoap.*(?:scribe|dashboard|beta|product)/i,
    ],
  },
  {
    catalogIds: ["syncsafety-product-mock"],
    label: "SyncSafety product mock",
    patterns: [/syncsafety/i, /ehs/i, /safety compliance/i],
  },
  {
    catalogIds: ["bringhurstdo-social-header"],
    label: "BringhurstDO social header",
    patterns: [/bringhurstdo/i, /build in public/i, /operator note/i],
  },
];

export function suggestCatalogAssetId(title: string, summary: string) {
  const haystack = `${title}\n${summary}`.trim();

  if (!haystack) {
    return null;
  }

  for (const hint of SOCIAL_CATALOG_HINTS) {
    if (hint.patterns.some((pattern) => pattern.test(haystack))) {
      return hint.catalogIds[0] ?? null;
    }
  }

  return null;
}

export function resolveSuggestedCatalogEntry<
  T extends { assetLocation: string; id: string; label: string },
>(entries: T[], title: string, summary: string) {
  const catalogId = suggestCatalogAssetId(title, summary);

  if (!catalogId) {
    return null;
  }

  const entry = entries.find((item) => item.id === catalogId);

  if (!entry) {
    return null;
  }

  const hint = SOCIAL_CATALOG_HINTS.find((item) =>
    item.catalogIds.includes(catalogId),
  );

  return {
    assetLocation: entry.assetLocation,
    catalogId,
    label: hint?.label ?? entry.label,
  };
}

export function resolveSuggestedCatalogEntryForProject<
  T extends {
    assetLocation: string;
    id: string;
    label: string;
    projectId: OpsProjectId;
  },
>(entries: T[], title: string, summary: string, projectId?: OpsProjectId) {
  const suggestion = resolveSuggestedCatalogEntry(entries, title, summary);

  if (!suggestion) {
    return null;
  }

  const entry = entries.find((item) => item.id === suggestion.catalogId);

  if (!entry) {
    return null;
  }

  if (projectId && entry.projectId !== projectId) {
    const projectEntry = entries.find(
      (item) => item.projectId === projectId && item.id.includes("product"),
    );

    if (projectEntry) {
      return {
        assetLocation: projectEntry.assetLocation,
        catalogId: projectEntry.id,
        label: projectEntry.label,
      };
    }
  }

  return suggestion;
}

export function resolveAutoPackageSocialImage<
  T extends {
    assetLocation: string;
    id: string;
    label: string;
    projectId: OpsProjectId;
  },
>(
  entries: T[],
  {
    currentAssetLocation,
    projectId,
    summary,
    title,
    updateType,
  }: {
    currentAssetLocation: string;
    projectId: OpsProjectId;
    summary: string;
    title: string;
    updateType?: SourceUpdateType;
  },
) {
  if (currentAssetLocation.trim()) {
    return null;
  }

  const suggestion = resolveSuggestedCatalogEntryForProject(
    entries,
    title,
    summary,
    projectId,
  );

  if (suggestion) {
    const catalogMatch = Boolean(suggestCatalogAssetId(title, summary));

    if (shouldAutoAttachCatalogImage(updateType, catalogMatch)) {
      return suggestion;
    }

    return null;
  }

  if (shouldAutoAttachCatalogImage(updateType, false)) {
    const projectDefault = resolveProjectDefaultCatalogEntry(
      entries,
      projectId,
    );

    if (projectDefault) {
      return {
        assetLocation: projectDefault.assetLocation,
        catalogId: projectDefault.id,
        label: projectDefault.label,
      };
    }
  }

  return null;
}
