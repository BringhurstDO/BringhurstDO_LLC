import {
  isAllowedOpsUploadContentType,
  maxUploadBytesForContentType,
} from "@/lib/ops/ops-media-kind";
import type { OpsProjectId } from "@/lib/ops/types";

const OPS_PROJECT_IDS = new Set<OpsProjectId>([
  "syncsoap",
  "syncsafety",
  "bringhurstdo",
]);

export type OpsMediaUploadClientPayload = {
  contentType: string;
  projectId: OpsProjectId;
  size: number;
};

export function sanitizeOpsMediaFileStem(name: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return stem || "social-media";
}

export function extensionForOpsMediaContentType(contentType: string) {
  switch (contentType.trim().toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    default:
      return "jpg";
  }
}

export function inferOpsMediaContentType(name: string, contentType: string) {
  const normalized = contentType.trim().toLowerCase();

  if (normalized) {
    return normalized;
  }

  const lowerName = name.toLowerCase();

  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".mp4")) return "video/mp4";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function createOpsMediaBlobPath(input: {
  contentType: string;
  originalName: string;
  projectId: OpsProjectId;
  uniqueId?: string;
}) {
  const extension = extensionForOpsMediaContentType(input.contentType);
  const fileStem = sanitizeOpsMediaFileStem(input.originalName);
  const uniqueId = input.uniqueId ?? Date.now().toString(36);

  return `ops-ig/${input.projectId}/${fileStem}-${uniqueId}.${extension}`;
}

export function parseOpsMediaUploadClientPayload(
  value: string | null,
): OpsMediaUploadClientPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value ?? "");
  } catch {
    throw new Error("Upload metadata is invalid.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Upload metadata is invalid.");
  }

  const candidate = parsed as Record<string, unknown>;
  const projectId = candidate.projectId;
  const contentType =
    typeof candidate.contentType === "string"
      ? candidate.contentType.trim().toLowerCase()
      : "";
  const size = candidate.size;

  if (
    typeof projectId !== "string" ||
    !OPS_PROJECT_IDS.has(projectId as OpsProjectId)
  ) {
    throw new Error("Upload project is invalid.");
  }

  if (!isAllowedOpsUploadContentType(contentType)) {
    throw new Error("Upload must be a JPEG, PNG, WebP, GIF, or MP4 file.");
  }

  if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0) {
    throw new Error("Upload file size is invalid.");
  }

  const maxBytes = maxUploadBytesForContentType(contentType);

  if (size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `Upload must be ${limitMb} MB or smaller for this media type.`,
    );
  }

  return {
    contentType,
    projectId: projectId as OpsProjectId,
    size,
  };
}

export function assertOpsMediaBlobPath(
  pathname: string,
  payload: OpsMediaUploadClientPayload,
) {
  const expectedPrefix = `ops-ig/${payload.projectId}/`;
  const expectedExtension = extensionForOpsMediaContentType(
    payload.contentType,
  );
  const fileName = pathname.slice(expectedPrefix.length);

  if (
    !pathname.startsWith(expectedPrefix) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+$/.test(fileName) ||
    !fileName.endsWith(`.${expectedExtension}`)
  ) {
    throw new Error("Upload path is invalid.");
  }
}
