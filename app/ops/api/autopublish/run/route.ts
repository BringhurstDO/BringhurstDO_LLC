import { NextResponse } from "next/server";

import { getAutopublishPublicStatus } from "@/lib/ops/autopublish-config";
import { runScheduledAutopublish } from "@/lib/ops/autopublish-runner";

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
  const publicStatus = getAutopublishPublicStatus();

  if (!publicStatus.enabled) {
    return jsonNoStore(
      {
        error: "Ops autopublish is disabled.",
        reason: publicStatus.disabledReason,
      },
      503,
    );
  }

  try {
    const result = await runScheduledAutopublish("manual");
    return jsonNoStore(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Autopublish run failed.";

    return jsonNoStore({ error: message }, 502);
  }
}
