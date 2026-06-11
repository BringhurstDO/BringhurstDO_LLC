import { NextResponse, type NextRequest } from "next/server";

import {
  createDatabaseOpsPersistenceAdapter,
  databasePersistenceConfigured,
} from "@/lib/ops/persistence-db";
import { validateOpsContentPackageRecords } from "@/lib/ops/persistence-validation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

export async function POST(request: NextRequest) {
  if (!databasePersistenceConfigured()) {
    return jsonNoStore(
      {
        error:
          "Ops database persistence is not configured. Migration import did not run.",
      },
      503,
    );
  }

  const payload = (await request.json()) as unknown;
  const exportPayload =
    payload && typeof payload === "object" && "contentPackages" in payload
      ? (payload as { contentPackages?: unknown }).contentPackages
      : payload;
  const validation = validateOpsContentPackageRecords(
    Array.isArray(exportPayload) ? exportPayload : [exportPayload],
    "migrationImport",
  );

  if (!validation.ok) {
    return jsonNoStore(
      {
        error: "Ops migration import rejected before database write.",
        issues: validation.issues,
      },
      400,
    );
  }

  const adapter = createDatabaseOpsPersistenceAdapter();
  const saved = await adapter.saveContentPackages(validation.records);

  return jsonNoStore({
    ...saved,
    importedRecords: validation.records.length,
  });
}
