import type {
  OpsAccountRegistryEntry,
  OpsAiPromptHistoryRecord,
  OpsBrandProfile,
  OpsContentPackageRecord,
  OpsServerPersistenceRecord,
} from "@/lib/ops/types";

export type OpsStorageMode = "local-browser" | "database-ready";

export type OpsPersistenceLoadResult = {
  contentPackages: OpsContentPackageRecord[];
  mode: OpsStorageMode;
  source: string;
};

export type OpsPersistenceSaveResult = {
  mode: OpsStorageMode;
  savedAt: string;
  source: string;
};

export type OpsPersistenceSnapshot = {
  accountRegistry: OpsAccountRegistryEntry[];
  aiPromptHistory: OpsAiPromptHistoryRecord[];
  brandRules: OpsBrandProfile[];
  contentPackages: OpsContentPackageRecord[];
  serverRecords: OpsServerPersistenceRecord[];
};

export type OpsPersistenceAdapter = {
  mode: OpsStorageMode;
  label: string;
  durabilityWarning: string;
  loadContentPackages(): Promise<OpsPersistenceLoadResult>;
  saveContentPackages(
    records: OpsContentPackageRecord[],
  ): Promise<OpsPersistenceSaveResult>;
};

type BrowserStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function createLocalStorageOpsPersistenceAdapter({
  storage,
  storageKey,
}: {
  storage: BrowserStorageLike;
  storageKey: string;
}): OpsPersistenceAdapter {
  return {
    durabilityWarning:
      "Saved in this browser only. Export JSON before clearing browser data, switching devices, or testing another browser.",
    label: "Storage mode: local browser",
    mode: "local-browser",
    async loadContentPackages() {
      const stored = storage.getItem(storageKey);

      return {
        contentPackages: stored ? (JSON.parse(stored) as unknown[]) as OpsContentPackageRecord[] : [],
        mode: "local-browser",
        source: storageKey,
      };
    },
    async saveContentPackages(records) {
      storage.setItem(storageKey, JSON.stringify(records, null, 2));

      return {
        mode: "local-browser",
        savedAt: new Date().toISOString(),
        source: storageKey,
      };
    },
  };
}

export const opsDatabasePersistenceAdapterPlan = {
  durabilityWarning:
    "Future server/database mode must keep tokens server-only and must reject PHI, credentials, private messages, raw logs, transcripts, and clinical payloads before writing.",
  label: "Storage mode: database-ready",
  mode: "database-ready" satisfies OpsStorageMode,
};
