import { NextResponse } from "next/server";

import { applySocialPublishLogBackfill } from "@/lib/ops/social-publish-log-backfill";
import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

/** Rehydrate deleted packages' successful publishes into the lean publish-log backfill package. */
export async function POST() {
  if (!databasePersistenceConfigured()) {
    return jsonNoStore(
      {
        error:
          "Ops database persistence is not configured. Publish-log backfill requires OPS_STORAGE_MODE=database.",
      },
      503,
    );
  }

  try {
    const result = await applySocialPublishLogBackfill();
    return jsonNoStore({ ok: true, result });
  } catch (error) {
    return jsonNoStore(
      {
        error:
          error instanceof Error
            ? error.message
            : "Publish-log backfill failed.",
      },
      500,
    );
  }
}
