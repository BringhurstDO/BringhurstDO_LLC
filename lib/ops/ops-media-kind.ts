import type { OpsMediaType } from "@/lib/ops/types";

export type OpsPublishMediaKind = "image" | "gif" | "video";

const IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function extensionFromAssetLocation(assetLocation: string) {
  const cleaned = assetLocation.trim().split("?")[0]?.split("#")[0] ?? "";
  const match = cleaned.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "";
}

export function classifyPublishMediaKind(input: {
  contentType?: string | null;
  url?: string | null;
}): OpsPublishMediaKind {
  const contentType = (input.contentType ?? "").trim().toLowerCase().split(";")[0];
  const extension = extensionFromAssetLocation(input.url ?? "");

  if (
    contentType === "video/mp4" ||
    contentType.startsWith("video/") ||
    extension === "mp4" ||
    extension === "mov" ||
    extension === "m4v"
  ) {
    return "video";
  }

  if (contentType === "image/gif" || extension === "gif") {
    return "gif";
  }

  return "image";
}

export function isAllowedOpsUploadContentType(contentType: string) {
  const normalized = contentType.trim().toLowerCase();
  return (
    IMAGE_CONTENT_TYPES.has(normalized) ||
    normalized === "image/gif" ||
    normalized === "video/mp4"
  );
}

export function maxUploadBytesForContentType(contentType: string) {
  const kind = classifyPublishMediaKind({ contentType });

  if (kind === "video") {
    return 50 * 1024 * 1024;
  }

  if (kind === "gif") {
    return 15 * 1024 * 1024;
  }

  return 8 * 1024 * 1024;
}

export function maxFetchBytesForMediaKind(kind: OpsPublishMediaKind) {
  if (kind === "video") {
    return 50 * 1024 * 1024;
  }

  if (kind === "gif") {
    return 15 * 1024 * 1024;
  }

  return 8 * 1024 * 1024;
}

export function mediaTypeFromAssetLocation(
  assetLocation: string,
): OpsMediaType {
  const trimmed = assetLocation.trim();

  if (!trimmed) {
    return "none";
  }

  const kind = classifyPublishMediaKind({ url: trimmed });

  if (kind === "video") {
    return "demo_video";
  }

  if (kind === "gif") {
    return "image";
  }

  return "screenshot";
}

export function isVideoAssetLocation(assetLocation: string) {
  return classifyPublishMediaKind({ url: assetLocation }) === "video";
}
