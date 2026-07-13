import { NextResponse, type NextRequest } from "next/server";

import {
  applyLinkedInAnalyticsImport,
  validateLinkedInAnalyticsImportPayload,
} from "@/lib/ops/linkedin-analytics-import";
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

export async function POST(request: NextRequest) {
  if (!databasePersistenceConfigured()) {
    return jsonNoStore(
      {
        error:
          "Ops database persistence is not configured. LinkedIn analytics import requires OPS_STORAGE_MODE=database.",
      },
      503,
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonNoStore({ error: "Expected JSON body." }, 400);
  }

  const validated = validateLinkedInAnalyticsImportPayload(payload);

  if (!validated.ok) {
    return jsonNoStore({ error: validated.error }, 400);
  }

  try {
    const result = await applyLinkedInAnalyticsImport(validated.value);
    return jsonNoStore(result);
  } catch (error) {
    return jsonNoStore(
      {
        error:
          error instanceof Error
            ? error.message
            : "LinkedIn analytics import failed.",
      },
      503,
    );
  }
}
