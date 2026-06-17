import { NextResponse } from "next/server";

import { buildOpsMarketingContext } from "@/lib/ops/marketing-context";
import { loadOpsContentRecords } from "@/lib/ops/load-content-records";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

export async function GET(request: Request) {
  const { records } = await loadOpsContentRecords();
  const context = buildOpsMarketingContext(records);
  const accept = request.headers.get("accept") ?? "";

  if (accept.includes("text/markdown")) {
    return new NextResponse(context.markdown, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/markdown; charset=utf-8",
      },
      status: 200,
    });
  }

  return jsonNoStore(context);
}
