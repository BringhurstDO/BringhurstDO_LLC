import { NextResponse } from "next/server";

import { getOpsAiPublicStatus } from "@/lib/ops/ai-config";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getOpsAiPublicStatus(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
