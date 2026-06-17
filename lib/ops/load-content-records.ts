import "server-only";

import {
  createDatabaseOpsPersistenceAdapter,
  databasePersistenceConfigured,
} from "@/lib/ops/persistence-db";
import type { OpsContentPackageRecord } from "@/lib/ops/types";

export async function loadOpsContentRecords(): Promise<{
  records: OpsContentPackageRecord[];
  source: "database" | "none";
}> {
  if (!databasePersistenceConfigured()) {
    return { records: [], source: "none" };
  }

  try {
    const adapter = createDatabaseOpsPersistenceAdapter();
    const loaded = await adapter.loadContentPackages();

    return {
      records: loaded.contentPackages,
      source: "database",
    };
  } catch {
    return { records: [], source: "none" };
  }
}
