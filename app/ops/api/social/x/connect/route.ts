import { NextResponse, type NextRequest } from "next/server";

import { buildAuthorizationUrl } from "@/lib/ops/x-client";
import { findXAccount, resolveXConfig } from "@/lib/ops/x-config";
import {
  createOAuthState,
  createPkcePair,
  X_OAUTH_ACCOUNT_COOKIE,
  X_OAUTH_PKCE_COOKIE,
  X_OAUTH_STATE_COOKIE,
  X_OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/lib/ops/x-oauth-state";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function accountsRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/ops/accounts", request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const status = resolveXConfig();

  if (!status.ok) {
    return NextResponse.redirect(
      accountsRedirect(request, { x_error: status.reason }),
    );
  }

  const requestedAccountId =
    request.nextUrl.searchParams.get("account")?.trim() ||
    status.config.accounts[0]?.accountId ||
    "";
  const account = findXAccount(status.config, requestedAccountId);

  if (!account) {
    return NextResponse.redirect(
      accountsRedirect(request, {
        x_error: `Unknown X account: ${requestedAccountId}`,
      }),
    );
  }

  const state = createOAuthState();
  const { codeChallenge, codeVerifier } = createPkcePair();
  const authorizationUrl = buildAuthorizationUrl(
    status.config,
    account,
    state,
    codeChallenge,
  );

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    maxAge: X_OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/ops",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  };
  response.cookies.set(X_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(X_OAUTH_ACCOUNT_COOKIE, account.accountId, cookieOptions);
  response.cookies.set(X_OAUTH_PKCE_COOKIE, codeVerifier, cookieOptions);
  response.headers.set("Cache-Control", "no-store");

  return response;
}
