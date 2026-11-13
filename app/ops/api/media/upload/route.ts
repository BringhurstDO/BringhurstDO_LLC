import { NextResponse, type NextRequest } from "next/server";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import {
  opsMediaUploadStatus,
  uploadOpsIgScreenshot,
} from "@/lib/ops/ops-media-upload";
import {
  assertOpsMediaBlobPath,
  inferOpsMediaContentType,
  parseOpsMediaUploadClientPayload,
} from "@/lib/ops/ops-media-upload-policy";
import { maxUploadBytesForContentType } from "@/lib/ops/ops-media-kind";
import type { OpsProjectId } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 60;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function asProjectId(value: FormDataEntryValue | null): OpsProjectId | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized === "syncsoap" ||
    normalized === "syncsafety" ||
    normalized === "bringhurstdo"
  ) {
    return normalized;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const uploadStatus = opsMediaUploadStatus();

  if (!uploadStatus.configured) {
    return jsonNoStore(
      {
        error: uploadStatus.reason ?? "Media upload is not configured.",
      },
      503,
    );
  }

  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = (await request.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const payload = parseOpsMediaUploadClientPayload(clientPayload);
          assertOpsMediaBlobPath(pathname, payload);

          return {
            addRandomSuffix: false,
            allowedContentTypes: [payload.contentType],
            maximumSizeInBytes: maxUploadBytesForContentType(
              payload.contentType,
            ),
          };
        },
      });

      return jsonNoStore(result);
    } catch (error) {
      return jsonNoStore(
        {
          error:
            error instanceof Error ? error.message : "Media upload failed.",
        },
        400,
      );
    }
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonNoStore({ error: "Expected multipart form upload." }, 400);
  }

  const projectId = asProjectId(formData.get("projectId"));
  const file = formData.get("file");

  if (!projectId) {
    return jsonNoStore(
      { error: "projectId must be syncsoap, syncsafety, or bringhurstdo." },
      400,
    );
  }

  if (!(file instanceof File)) {
    return jsonNoStore({ error: "file is required." }, 400);
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inferredType = inferOpsMediaContentType(file.name, file.type);
    const uploaded = await uploadOpsIgScreenshot({
      bytes,
      contentType: inferredType,
      originalName: file.name || "social-media.jpg",
      projectId,
    });

    return jsonNoStore({
      assetLocation: uploaded.assetLocation,
      contentType: uploaded.contentType,
      fileName: uploaded.fileName,
      storage: uploaded.storage,
    });
  } catch (error) {
    return jsonNoStore(
      {
        error:
          error instanceof Error ? error.message : "Media upload failed.",
      },
      400,
    );
  }
}
