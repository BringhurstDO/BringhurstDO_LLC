import {
  draftHasLegacyTemplateArtifacts,
  sanitizePublishableBody,
} from "@/lib/ops/publishable-copy";
import type { PublicationTarget } from "@/lib/ops/types";

export const xSinglePostLimit = 280;

function cleanTemplateInput(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

function withTerminalPunctuation(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return normalized;
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const clipped = value.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");

  return withTerminalPunctuation(
    clipped.slice(0, lastSpace > 40 ? lastSpace : clipped.length),
  );
}

function sentenceExcerpt(value: string, maxLength: number) {
  const normalized = cleanTemplateInput(value, "");

  if (normalized.length <= maxLength) {
    return withTerminalPunctuation(normalized);
  }

  const clipped = normalized.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?"),
  );

  if (sentenceEnd >= 80) {
    return withTerminalPunctuation(clipped.slice(0, sentenceEnd + 1));
  }

  return truncateAtWord(normalized, maxLength);
}

function collapseRepeatedPunctuation(value: string) {
  return value
    .replace(/\.{2,}/g, ".")
    .replace(/\s+\./g, ".")
    .replace(/([!?])\.+/g, "$1");
}

function cleanXExcerptEnding(value: string) {
  let next = value.trim().replace(/[,:;\s-]+$/g, "").replace(/[.!?]+$/g, "");
  const danglingPhrasePatterns = [
    /\bgiven the length of the$/i,
    /\bgiven the length of$/i,
    /\bwe are excited to launch the$/i,
    /\bcurious to see how the respective social media pages will do$/i,
  ];

  for (const pattern of danglingPhrasePatterns) {
    if (pattern.test(next)) {
      next = next.replace(pattern, "").trim();
    }
  }

  return next;
}

function xSummaryExcerpt(summary: string, maxLength: number) {
  const normalized = cleanTemplateInput(summary, "");

  if (normalized.length <= maxLength) {
    return cleanXExcerptEnding(normalized);
  }

  const clipped = normalized.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?"),
  );

  if (sentenceEnd >= 35) {
    return cleanXExcerptEnding(clipped.slice(0, sentenceEnd + 1));
  }

  const phraseEnds = [",", ";", ":", " - ", " -- "]
    .map((marker) => clipped.lastIndexOf(marker))
    .filter((index) => index >= 35);
  const phraseEnd = phraseEnds.length > 0 ? Math.max(...phraseEnds) : -1;

  if (phraseEnd >= 35) {
    return cleanXExcerptEnding(clipped.slice(0, phraseEnd));
  }

  const lastSpace = clipped.lastIndexOf(" ");
  const wordBoundary = lastSpace >= 35 ? lastSpace : clipped.length;

  return cleanXExcerptEnding(clipped.slice(0, wordBoundary));
}

/**
 * Link-free X body. Package/source titles stay in Ops metadata — do not prefix
 * them into the tweet (they eat the 280 budget and read like internal labels).
 * Destination URLs belong on `generatedUrl`, not in copy.
 */
export function xDraftBody(
  _title: string,
  summary: string,
  _destinationUrl = "",
) {
  const summaryLine = xSummaryExcerpt(summary, xSinglePostLimit);

  if (summaryLine) {
    return collapseRepeatedPunctuation(summaryLine);
  }

  return collapseRepeatedPunctuation(
    truncateAtWord("Product update", xSinglePostLimit),
  );
}

function productHashtag(target: PublicationTarget) {
  if (target.projectId === "syncsoap") {
    return "#SyncSOAP";
  }

  if (target.projectId === "syncsafety") {
    return "#SyncSafety";
  }

  return "#BringhurstDO";
}

function targetIsBlocked(target: PublicationTarget) {
  return (
    target.accountStatus !== undefined && target.accountStatus !== "active"
  );
}

export function blockedTargetOperatorNotes(target: PublicationTarget) {
  return [
    `Internal: ${target.accountName} is blocked pending account trust review.`,
    "Internal: do not post until account status is active.",
    "Internal: human approval required before any future publishing.",
  ];
}

/**
 * Deterministic draft bodies are link-free. UTM destination stays on the draft
 * record for operator reference. Instagram may include a single product hashtag.
 */
export function draftTemplateBody({
  destinationUrl: _destinationUrl,
  sourceSummary,
  sourceTitle,
  target,
}: {
  campaign?: string;
  destinationUrl: string;
  sourceSummary: string;
  sourceTitle: string;
  target: PublicationTarget;
}) {
  const title = cleanTemplateInput(sourceTitle, "Product update");
  const summary = cleanTemplateInput(
    sourceSummary,
    "A product and operator update is ready for review.",
  );
  const productTag = productHashtag(target);

  if (target.platform === "Facebook" && targetIsBlocked(target)) {
    return sanitizePublishableBody([title, "", summary].join("\n"));
  }

  if (target.platform === "LinkedIn") {
    return sanitizePublishableBody([title, "", summary].join("\n"));
  }

  if (target.platform === "Instagram") {
    return sanitizePublishableBody(
      [title, "", sentenceExcerpt(summary, 200), "", productTag].join("\n"),
    );
  }

  if (target.platform === "X") {
    return sanitizePublishableBody(xDraftBody(title, summary));
  }

  if (target.platform === "Facebook") {
    return sanitizePublishableBody([title, "", summary].join("\n"));
  }

  return sanitizePublishableBody([title, "", summary].join("\n"));
}

export function draftLooksLikeLegacyGeneratedBody(body: string) {
  return !body.trim() || draftHasLegacyTemplateArtifacts(body);
}
