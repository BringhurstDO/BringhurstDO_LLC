import { NextResponse, type NextRequest } from "next/server";

import {
  createDatabaseOpsPersistenceAdapter,
  databasePersistenceConfigured,
} from "@/lib/ops/persistence-db";
import { validateOpsContentPackageRecords } from "@/lib/ops/persistence-validation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function databaseUnavailable() {
  return NextResponse.json(
    {
      error:
        "Ops database persistence is not configured. Use local browser storage fallback.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 503,
    },
  );
}

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

export async function GET() {
  if (!databasePersistenceConfigured()) {
    return databaseUnavailable();
  }

  const adapter = createDatabaseOpsPersistenceAdapter();
  const loaded = await adapter.loadContentPackages();

  return jsonNoStore(loaded);
}

export async function PUT(request: NextRequest) {
  if (!databasePersistenceConfigured()) {
    return databaseUnavailable();
  }

  const payload = (await request.json()) as unknown;
  const contentPackages =
    payload &&
    typeof payload === "object" &&
    "contentPackages" in payload
      ? (payload as { contentPackages?: unknown }).contentPackages
      : undefined;
  const validation = validateOpsContentPackageRecords(
    contentPackages,
    "persistenceRequest.contentPackages",
  );

  if (!validation.ok) {
    return jsonNoStore(
      {
        error: "Ops database payload rejected before write.",
        issues: validation.issues,
      },
      400,
    );
  }

  const adapter = createDatabaseOpsPersistenceAdapter();
  const saved = await adapter.saveContentPackages(validation.records);

  return jsonNoStore(saved);
}
