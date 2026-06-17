import { NextResponse, type NextRequest } from "next/server";

import { saveSocialConnection } from "@/lib/ops/social-connections-db";
import {
  exchangeCodeForToken,
  resolveAuthorIdentity,
} from "@/lib/ops/x-client";
import { findXAccount, resolveXConfig } from "@/lib/ops/x-config";
import {
  verifyOAuthState,
  X_OAUTH_ACCOUNT_COOKIE,
  X_OAUTH_PKCE_COOKIE,
  X_OAUTH_STATE_COOKIE,
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

function clearOAuthCookies(response: NextResponse) {
  for (const name of [
    X_OAUTH_STATE_COOKIE,
    X_OAUTH_ACCOUNT_COOKIE,
    X_OAUTH_PKCE_COOKIE,
  ]) {
    response.cookies.set(name, "", { httpOnly: true, maxAge: 0, path: "/ops" });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const status = resolveXConfig();

  if (!status.ok) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, { x_error: status.reason }),
      ),
    );
  }

  const { searchParams } = request.nextUrl;
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const description =
      searchParams.get("error_description") ?? "X authorization failed.";
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, { x_error: description }),
      ),
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get(X_OAUTH_STATE_COOKIE)?.value ?? null;
  const cookieAccountId =
    request.cookies.get(X_OAUTH_ACCOUNT_COOKIE)?.value ?? "";
  const codeVerifier = request.cookies.get(X_OAUTH_PKCE_COOKIE)?.value ?? "";

  if (!verifyOAuthState(state, cookieState)) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          x_error: "OAuth state validation failed. Try connecting again.",
        }),
      ),
    );
  }

  if (!codeVerifier) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          x_error: "OAuth PKCE verifier missing. Try connecting again.",
        }),
      ),
    );
  }

  const account = findXAccount(status.config, cookieAccountId);

  if (!account) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          x_error: "Connection account could not be resolved. Try again.",
        }),
      ),
    );
  }

  if (!code) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          x_error: "X did not return an authorization code.",
        }),
      ),
    );
  }

  try {
    const token = await exchangeCodeForToken(status.config, code, codeVerifier);
    const author = await resolveAuthorIdentity(account, token.accessToken);

    await saveSocialConnection({
      accessToken: token.accessToken,
      accountId: account.accountId,
      accountLabel: author.label || account.label,
      authorType: author.authorType,
      authorUrn: author.authorUrn,
      expiresAt: token.expiresAt,
      platform: "X",
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scopes: token.scope ? token.scope.split(" ") : account.scopes,
    });

    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          x: "connected",
          x_account: account.accountId,
        }),
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "X connection failed.";
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, { x_error: message }),
      ),
    );
  }
}
