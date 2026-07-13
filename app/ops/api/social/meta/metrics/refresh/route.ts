import { NextResponse } from "next/server";

import { runScheduledMetaMetricsReadback } from "@/lib/ops/meta-metrics-readback-runner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 120;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST() {
  try {
    const result = await runScheduledMetaMetricsReadback();
    return jsonNoStore(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Meta metrics readback failed.";

    return jsonNoStore({ error: message }, 503);
  }
}
