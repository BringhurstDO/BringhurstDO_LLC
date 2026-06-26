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
    catalogIds: ["syncsoap-product-screenshot"],
    label: "SyncSOAP product screenshot",
    patterns: [
      /syncsoap/i,
      /ambient scribe/i,
      /ai scribe/i,
      /provider dashboard/i,
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
