import { NextResponse } from "next/server";

import { getAutopublishPublicStatus, calendarDateInTimezone } from "@/lib/ops/autopublish-config";

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

  return jsonNoStore({
    ...status,
    runDateToday: calendarDateInTimezone(status.timeZone),
  });
}
