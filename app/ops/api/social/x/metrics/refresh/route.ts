import { NextResponse } from "next/server";

import { runScheduledXMetricsReadback } from "@/lib/ops/x-metrics-readback-runner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST() {
  try {
    const result = await runScheduledXMetricsReadback();
    return jsonNoStore(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "X metrics readback failed.";

    return jsonNoStore({ error: message }, 503);
  }
}
