import { NextResponse, type NextRequest } from "next/server";

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

function verifyCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return jsonNoStore({ error: "Unauthorized cron request." }, 401);
  }

  try {
    const result = await runScheduledXMetricsReadback();
    return jsonNoStore(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "X metrics readback failed.";

    return jsonNoStore({ error: message }, 503);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
