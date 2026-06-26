import "server-only";

import type { OpsProjectId } from "@/lib/ops/types";

export type OpsIgMediaCatalogEntry = {
  assetLocation: string;
  id: string;
  label: string;
  projectId: OpsProjectId;
  tags: string[];
};

const BUILTIN_CATALOG: OpsIgMediaCatalogEntry[] = [
  {
    assetLocation: "/ops-ig/america-250-square.png",
    id: "america-250-square",
    label: "America 250 — Instagram square",
    projectId: "bringhurstdo",
    tags: ["america-250", "brand", "approved", "instagram"],
  },
  {
    assetLocation: "/ops-ig/america-250-facebook.png",
    id: "america-250-facebook",
    label: "America 250 — Facebook link",
    projectId: "bringhurstdo",
    tags: ["america-250", "brand", "approved", "facebook"],
  },
  {
    assetLocation: "/ops-ig/syncsoap-product-screenshot.png",
    id: "syncsoap-product-screenshot",
    label: "SyncSOAP product screenshot",
    projectId: "syncsoap",
    tags: ["product", "screenshot", "approved", "instagram"],
  },
  {
    assetLocation: "/syncsafety-mock.jpg",
    id: "syncsafety-product-mock",
    label: "SyncSafety product mock",
    projectId: "syncsafety",
    tags: ["product", "screenshot", "approved"],
  },
  {
    assetLocation: "/bringhurstdo-social-header.png",
    id: "bringhurstdo-social-header",
    label: "BringhurstDO social header",
    projectId: "bringhurstdo",
    tags: ["brand", "approved"],
  },
  {
    assetLocation: "/founder-headshot.jpg",
    id: "founder-headshot",
    label: "Founder headshot",
    projectId: "bringhurstdo",
    tags: ["founder", "approved"],
  },
];

function parseEnvCatalog() {
  const raw = process.env.OPS_IG_MEDIA_CATALOG?.trim();

  if (!raw) {
    return [] as OpsIgMediaCatalogEntry[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const entries: OpsIgMediaCatalogEntry[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as {
        assetLocation?: unknown;
        id?: unknown;
        label?: unknown;
        projectId?: unknown;
        tags?: unknown;
      };
      const assetLocation =
        typeof record.assetLocation === "string" ? record.assetLocation.trim() : "";
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const projectId =
        record.projectId === "syncsoap" ||
        record.projectId === "syncsafety" ||
        record.projectId === "bringhurstdo"
          ? record.projectId
          : null;

      if (!assetLocation || !id || !label || !projectId) {
        continue;
      }

      entries.push({
        assetLocation,
        id,
        label,
        projectId,
        tags: Array.isArray(record.tags)
          ? record.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
      });
    }

    return entries;
  } catch {
    return [];
  }
}

export function listOpsIgMediaCatalog(projectId?: OpsProjectId) {
  const merged = new Map<string, OpsIgMediaCatalogEntry>();

  for (const entry of [...BUILTIN_CATALOG, ...parseEnvCatalog()]) {
    merged.set(entry.id, entry);
  }

  const catalog = Array.from(merged.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );

  if (!projectId) {
    return catalog;
  }

  return catalog.filter((entry) => entry.projectId === projectId);
}
