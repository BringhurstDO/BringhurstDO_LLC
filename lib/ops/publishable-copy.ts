/** Internal-only defaults — never include in publishable `body`. */
export const DEFAULT_PACKAGE_OPERATOR_NOTES = [
  "Ops content package record.",
  "Human approval required before external posting or spend.",
] as const;

export const DEFAULT_DRAFT_OPERATOR_NOTES = [
  "Internal: confirm metadata-only boundary before posting.",
  "Internal: post manually; no autoposting API is connected.",
] as const;

export const DEFAULT_DRAFT_SAFETY_NOTES = [
  "No PHI, private identifiers, credentials, or raw logs in public copy.",
] as const;

/** Lines or phrases that must not appear in publishable social bodies. */
export const PUBLISHABLE_BODY_FORBIDDEN_PATTERNS = [
  /manual approval/i,
  /manual review/i,
  /autopost/i,
  /no meta api/i,
  /no posting api/i,
  /\bcampaign\s*:/i,
  /metadata-only/i,
  /local\/mock/i,
  /\bdraft id\b/i,
  /manual operator/i,
  /operator workflow/i,
  /checklist/i,
  /thread-ready/i,
  /manual split/i,
  /useful signal is simple/i,
  /\bbuilt for general\b/i,
  /\bbuilt for [a-z][a-z\s-]{0,24}\.\s*$/im,
  /no autoposting/i,
  /no publishing api/i,
  /\butm link\s*:/i,
  /\btarget\s*:/i,
  /posting api is connected/i,
  /no meta api is connected/i,
  /pending meta trust/i,
  /should not be used for live posting/i,
  /governance\/process/i,
] as const;

const STRIP_LINE_PATTERNS = [
  /^campaign\s*:/i,
  /^target\s*:/i,
  /^destination\s*:/i,
  /^utm link\s*:/i,
  /^draft id\s*:/i,
  /^status\s*:/i,
  /^posted\s*:/i,
  /^source project\s*:/i,
  /^publishing project\s*:/i,
  /^manual approval required/i,
  /^manual review before anything goes live/i,
  /^no autoposting is connected/i,
  /^no meta api is connected/i,
  /^no posting api is connected/i,
  /^thread-ready\s*:/i,
  /^blocked facebook draft for/i,
  /^this account is pending meta trust/i,
  /^keep this slot disabled until/i,
  /useful signal is simple/i,
  /^built for [^.!?]+[.!?]?$/i,
  /^for [^.!?]+,\s*the useful signal is simple/i,
  /^for general[.!?]?$/i,
  /^for investors[.!?]?$/i,
] as const;

export function containsPublishableArtifact(text: string) {
  return PUBLISHABLE_BODY_FORBIDDEN_PATTERNS.some((pattern) =>
    pattern.test(text),
  );
}

export function stripTemplateArtifacts(body: string) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const kept = lines.filter(
    (line) => !STRIP_LINE_PATTERNS.some((pattern) => pattern.test(line.trim())),
  );

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizePublishableBody(body: string) {
  let next = stripTemplateArtifacts(body);

  for (const pattern of PUBLISHABLE_BODY_FORBIDDEN_PATTERNS) {
    next = next.replace(pattern, "");
  }

  return next
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function draftHasLegacyTemplateArtifacts(body: string) {
  return containsPublishableArtifact(body) || STRIP_LINE_PATTERNS.some((pattern) =>
    pattern.test(body),
  );
}
