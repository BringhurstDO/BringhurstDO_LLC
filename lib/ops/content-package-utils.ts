import type { PublicationTarget } from "@/lib/ops/types";
import { buildUtmUrl } from "@/lib/ops/utm";

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "content-package";
}

export function nowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function currentCaptureDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function targetToSource(target: PublicationTarget) {
  return target.platform.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function campaignName(sourceTitle: string, target: PublicationTarget) {
  return `${slugify(sourceTitle)}_${targetToSource(target)}`;
}

function platformMedium(target: PublicationTarget) {
  return target.platform === "Email" ? "manual" : "organic";
}

export function buildUtmForTarget(
  target: PublicationTarget,
  campaign: string,
  content = target.id,
) {
  return buildUtmUrl({
    campaign,
    content,
    destinationUrl: target.defaultDestinationUrl,
    medium: platformMedium(target),
    source: targetToSource(target),
  });
}

export function targetIsBlocked(target: PublicationTarget) {
  return (
    target.accountStatus !== undefined && target.accountStatus !== "active"
  );
}

function collapseRepeatedPunctuation(value: string) {
  return value
    .replace(/\.{2,}/g, ".")
    .replace(/\s+\./g, ".")
    .replace(/([!?])\.+/g, "$1");
}

/**
 * Keep destination/UTM on the draft record only. Bodies stay link-free.
 * Legacy callers that used to inject `generatedUrl` now strip URLs instead.
 */
export function bodyWithGeneratedUrl(
  body: string,
  _generatedUrl = "",
  _options: { appendIfMissing?: boolean } = {},
) {
  const trimmed = body.trim();

  if (!trimmed) {
    return "";
  }

  return collapseRepeatedPunctuation(
    trimmed
      .replace(/\b(?:https?:\/\/|www\.)[^\s)\]>"']+/gi, "")
      .replace(/^(?:read more|learn more):\s*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}
