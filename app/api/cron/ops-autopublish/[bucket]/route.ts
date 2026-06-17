import { NextResponse, type NextRequest } from "next/server";

import { runScheduledAutopublish } from "@/lib/ops/autopublish-runner";
import {
  DEFAULT_OPS_SCHEDULE_TIMEZONE,
  scheduleBucketIsDueNow,
} from "@/lib/ops/platform-schedule-defaults";
import type { OpsScheduleBucketId } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const bucketIds: OpsScheduleBucketId[] = [
  "morning",
  "midday",
  "afternoon",
  "evening",
  "late-evening",
];

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

function parseBucket(value: string | undefined) {
  return bucketIds.find((bucketId) => bucketId === value) ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string }> },
) {
  if (!verifyCronSecret(request)) {
    return jsonNoStore({ error: "Unauthorized cron request." }, 401);
  }

  const { bucket } = await params;
  const bucketId = parseBucket(bucket);

  if (!bucketId) {
    return jsonNoStore({ error: "Unknown schedule bucket." }, 400);
  }

  if (!scheduleBucketIsDueNow({ bucketId })) {
    return jsonNoStore({
      bucketId,
      skipped: true,
      reason: `Not due for this local hour in ${DEFAULT_OPS_SCHEDULE_TIMEZONE}.`,
    });
  }

  try {
    const result = await runScheduledAutopublish("cron", { bucketId });
    return jsonNoStore(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Autopublish cron run failed.";

    return jsonNoStore({ error: message }, 503);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bucket: string }> },
) {
  return GET(request, context);
}
