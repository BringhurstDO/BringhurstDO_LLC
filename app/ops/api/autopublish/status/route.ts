import { NextResponse } from "next/server";

import { getAutopublishPublicStatus, calendarDateInTimezone } from "@/lib/ops/autopublish-config";
import { loadLatestAutopublishRunRecord } from "@/lib/ops/autopublish-runs-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function GET() {
  const status = getAutopublishPublicStatus();
  const lastRun = await loadLatestAutopublishRunRecord().catch(() => null);

  return jsonNoStore({
    ...status,
    lastRun: lastRun
      ? {
          bucketId: lastRun.bucketId ?? null,
          createdAt: lastRun.createdAt,
          errorCount: lastRun.errorCount,
          publishedCount: lastRun.publishedCount,
          runDate: lastRun.runDate,
          skippedCount: lastRun.skippedCount,
          status: lastRun.status,
          trigger: lastRun.trigger,
        }
      : null,
    runDateToday: calendarDateInTimezone(status.timeZone),
  });
}
