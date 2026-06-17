import "server-only";

import type { NextRequest } from "next/server";

/** Canonical site origin for OAuth redirects (prefer configured callback URIs). */
export function resolveOpsPublicOrigin(fallbackOrigin?: string) {
  for (const raw of [
    process.env.X_REDIRECT_URI,
    process.env.LINKEDIN_REDIRECT_URI,
    process.env.OPS_PUBLIC_ORIGIN,
  ]) {
    const value = raw?.trim();
    if (!value) {
      continue;
    }

    try {
      return new URL(value).origin;
    } catch {
      continue;
    }
  }

  return fallbackOrigin ?? "";
}

export function redirectToCanonicalOpsOrigin(request: NextRequest) {
  const canonical = resolveOpsPublicOrigin(request.nextUrl.origin);
  if (!canonical || request.nextUrl.origin === canonical) {
    return null;
  }

  const target = new URL(request.url);
  const canonicalUrl = new URL(canonical);
  target.protocol = canonicalUrl.protocol;
  target.host = canonicalUrl.host;

  return target;
}
