import { NextResponse, type NextRequest } from "next/server";

import { listOpsIgMediaCatalog } from "@/lib/ops/ops-ig-media-catalog";
import { opsMediaUploadStatus } from "@/lib/ops/ops-media-upload";
import type { OpsProjectId } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function asProjectId(value: string | null): OpsProjectId | undefined {
  if (
    value === "syncsoap" ||
    value === "syncsafety" ||
    value === "bringhurstdo"
  ) {
    return value;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  const projectId = asProjectId(
    request.nextUrl.searchParams.get("projectId")?.trim() || null,
  );
  const uploadStatus = opsMediaUploadStatus();

  return jsonNoStore({
    entries: listOpsIgMediaCatalog(projectId),
    upload: uploadStatus,
  });
}
