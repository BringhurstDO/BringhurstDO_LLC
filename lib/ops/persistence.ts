import type {
  OpsAccountRegistryEntry,
  OpsAiPromptHistoryRecord,
  OpsAudienceProfile,
  OpsBrandProfile,
  OpsContentPackageRecord,
  OpsServerPersistenceRecord,
} from "@/lib/ops/types";

export type OpsStorageMode = "local-browser" | "database" | "database-ready";

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
  audienceProfiles: OpsAudienceProfile[];
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

type FetchLike = typeof fetch;

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
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];

      return {
        contentPackages: Array.isArray(parsed)
          ? (parsed as OpsContentPackageRecord[])
          : [],
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

export function createRemoteOpsPersistenceAdapter({
  endpoint = "/ops/api/persistence/packages",
  fetcher = fetch,
}: {
  endpoint?: string;
  fetcher?: FetchLike;
} = {}): OpsPersistenceAdapter {
  return {
    durabilityWarning:
      "Saved to the protected Ops database route. Keep JSON exports as a manual backup until database backups are verified.",
    label: "Storage mode: durable database",
    mode: "database",
    async loadContentPackages() {
      const response = await fetcher(endpoint, {
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Ops database load failed with ${response.status}.`);
      }

      const payload = (await response.json()) as OpsPersistenceLoadResult;

      return {
        contentPackages: Array.isArray(payload.contentPackages)
          ? payload.contentPackages
          : [],
        mode: "database",
        source: payload.source ?? endpoint,
      };
    },
    async saveContentPackages(records) {
      const response = await fetcher(endpoint, {
        body: JSON.stringify({ contentPackages: records }),
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error(`Ops database save failed with ${response.status}.`);
      }

      const payload = (await response.json()) as OpsPersistenceSaveResult;

      return {
        mode: "database",
        savedAt: payload.savedAt,
        source: payload.source ?? endpoint,
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
