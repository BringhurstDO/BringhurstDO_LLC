import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { put } from "@vercel/blob";

import type { OpsProjectId } from "@/lib/ops/types";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type OpsMediaUploadResult = {
  assetLocation: string;
  contentType: string;
  fileName: string;
  storage: "local-public" | "vercel-blob";
};

function sanitizeFileStem(name: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return stem || "screenshot";
}

function extensionForContentType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

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
      "Set BLOB_READ_WRITE_TOKEN on Vercel for production screenshot uploads, or pick an approved catalog image.",
  };
}

export async function uploadOpsIgScreenshot(input: {
  bytes: Uint8Array;
  contentType: string;
  originalName: string;
  projectId: OpsProjectId;
}): Promise<OpsMediaUploadResult> {
  const contentType = input.contentType.trim().toLowerCase();

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Upload must be a JPEG, PNG, or WebP image.");
  }

  if (input.bytes.byteLength === 0) {
    throw new Error("Upload file is empty.");
  }

  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Upload must be 4 MB or smaller for Instagram publishing.");
  }

  const extension = extensionForContentType(contentType);
  const fileStem = sanitizeFileStem(input.originalName);
  const fileName = `${fileStem}-${Date.now().toString(36)}.${extension}`;

  if (blobUploadConfigured()) {
    const blob = await put(
      `ops-ig/${input.projectId}/${fileName}`,
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
