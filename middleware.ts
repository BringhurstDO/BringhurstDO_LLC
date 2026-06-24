import { NextResponse, type NextRequest } from "next/server";

import {
  createOpsAuthSessionValue,
  opsAuthSessionCookieName,
  opsAuthSessionCookieOptions,
  verifyOpsAuthSessionValue,
} from "@/lib/ops/ops-auth-session";

const OPS_REALM = "BringhurstDO Ops";

const OAUTH_CALLBACK_PATHS = new Set([
  "/ops/api/social/linkedin/callback",
  "/ops/api/social/meta/callback",
  "/ops/api/social/x/callback",
]);

function resolveCanonicalOpsOrigin() {
  for (const raw of [
    process.env.X_REDIRECT_URI,
    process.env.LINKEDIN_REDIRECT_URI,
    process.env.META_REDIRECT_URI,
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

  return null;
}

function unauthorized() {
  return new NextResponse(null, {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${OPS_REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function getBasicAuthCredentials(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

async function attachSessionCookie(request: NextRequest, response: NextResponse) {
  const session = await createOpsAuthSessionValue();
  if (!session) {
    return response;
  }

  response.cookies.set(
    opsAuthSessionCookieName(),
    session,
    opsAuthSessionCookieOptions(
      request.nextUrl.hostname,
      request.nextUrl.protocol === "https:",
    ),
  );

  return response;
}

function nextAuthorizedResponse() {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const canonicalOrigin = resolveCanonicalOpsOrigin();
  if (canonicalOrigin && request.nextUrl.origin !== canonicalOrigin) {
    const target = new URL(request.url);
    const canonical = new URL(canonicalOrigin);
    target.protocol = canonical.protocol;
    target.host = canonical.host;
    return NextResponse.redirect(target, 308);
  }

  if (OAUTH_CALLBACK_PATHS.has(pathname)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const configuredUsername = process.env.OPS_BASIC_AUTH_USERNAME?.trim();
  const configuredPasswordHash =
    process.env.OPS_BASIC_AUTH_PASSWORD_SHA256?.trim().toLowerCase();

  if (!configuredUsername || !configuredPasswordHash) {
    return unauthorized();
  }

  const sessionValue = request.cookies.get(opsAuthSessionCookieName())?.value;
  const sessionValid = await verifyOpsAuthSessionValue(sessionValue);
  const credentials = getBasicAuthCredentials(request);

  if (credentials) {
    const suppliedPasswordHash = await sha256Hex(credentials.password);
    const usernameMatches = constantTimeEqual(
      credentials.username.trim(),
      configuredUsername,
    );
    const passwordMatches = constantTimeEqual(
      suppliedPasswordHash,
      configuredPasswordHash,
    );

    if (!usernameMatches || !passwordMatches) {
      return unauthorized();
    }

    return await attachSessionCookie(request, nextAuthorizedResponse());
  }

  if (sessionValid) {
    return nextAuthorizedResponse();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/ops/:path*"],
};
