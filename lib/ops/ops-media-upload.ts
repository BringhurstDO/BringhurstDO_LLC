import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import {
  isAllowedOpsUploadContentType,
  maxUploadBytesForContentType,
} from "@/lib/ops/ops-media-kind";
import { createOpsMediaBlobPath } from "@/lib/ops/ops-media-upload-policy";
import type { OpsProjectId } from "@/lib/ops/types";

export type OpsMediaUploadResult = {
  assetLocation: string;
  contentType: string;
  fileName: string;
  storage: "local-public" | "vercel-blob";
};

function blobUploadConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function opsMediaUploadStatus() {
  if (blobUploadConfigured()) {
    return {
      configured: true,
      mode: "vercel-blob" as const,
      reason: null,
    };
  }

  if (process.env.NODE_ENV === "development") {
    return {
      configured: true,
      mode: "local-public" as const,
      reason: null,
    };
  }

  return {
    configured: false,
    mode: null,
    reason:
      "Set BLOB_READ_WRITE_TOKEN on Vercel for production media uploads, or pick an approved catalog image.",
  };
}

export async function uploadOpsIgScreenshot(input: {
  bytes: Uint8Array;
  contentType: string;
  originalName: string;
  projectId: OpsProjectId;
}): Promise<OpsMediaUploadResult> {
  const contentType = input.contentType.trim().toLowerCase();

  if (!isAllowedOpsUploadContentType(contentType)) {
    throw new Error("Upload must be a JPEG, PNG, WebP, GIF, or MP4 file.");
  }

  if (input.bytes.byteLength === 0) {
    throw new Error("Upload file is empty.");
  }

  const maxBytes = maxUploadBytesForContentType(contentType);

  if (input.bytes.byteLength > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Upload must be ${limitMb} MB or smaller for this media type.`);
  }

  const blobPath = createOpsMediaBlobPath({
    contentType,
    originalName: input.originalName,
    projectId: input.projectId,
  });
  const fileName = path.posix.basename(blobPath);

  if (blobUploadConfigured()) {
    const blob = await put(
      blobPath,
      Buffer.from(input.bytes),
      {
        access: "public",
        addRandomSuffix: false,
        contentType,
      },
    );

    return {
      assetLocation: blob.url,
      contentType,
      fileName,
      storage: "vercel-blob",
    };
  }

  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      "Production uploads require BLOB_READ_WRITE_TOKEN. Use an approved catalog image or configure Vercel Blob.",
    );
  }

  const relativeDir = path.join("ops-ig", "uploads", input.projectId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), Buffer.from(input.bytes));

  return {
    assetLocation: `/${relativeDir.replace(/\\/g, "/")}/${fileName}`,
    contentType,
    fileName,
    storage: "local-public",
  };
}
