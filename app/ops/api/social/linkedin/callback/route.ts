import { NextResponse, type NextRequest } from "next/server";

import {
  exchangeCodeForToken,
  resolveAuthorUrn,
} from "@/lib/ops/linkedin-client";
import {
  findLinkedInAccount,
  resolveLinkedInConfig,
} from "@/lib/ops/linkedin-config";
import {
  LINKEDIN_OAUTH_ACCOUNT_COOKIE,
  LINKEDIN_OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/ops/linkedin-oauth-state";
import { saveSocialConnection } from "@/lib/ops/social-connections-db";

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
    LINKEDIN_OAUTH_STATE_COOKIE,
    LINKEDIN_OAUTH_ACCOUNT_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/ops",
      maxAge: 0,
    });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const status = resolveLinkedInConfig();

  if (!status.ok) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, { linkedin_error: status.reason }),
      ),
    );
  }

  const { searchParams } = request.nextUrl;
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const description =
      searchParams.get("error_description") ?? "LinkedIn authorization failed.";
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, { linkedin_error: description }),
      ),
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState =
    request.cookies.get(LINKEDIN_OAUTH_STATE_COOKIE)?.value ?? null;
  const cookieAccountId =
    request.cookies.get(LINKEDIN_OAUTH_ACCOUNT_COOKIE)?.value ?? "";

  if (!verifyOAuthState(state, cookieState)) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          linkedin_error: "OAuth state validation failed. Try connecting again.",
        }),
      ),
    );
  }

  const account = findLinkedInAccount(status.config, cookieAccountId);

  if (!account) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          linkedin_error: "Connection account could not be resolved. Try again.",
        }),
      ),
    );
  }

  if (!code) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          linkedin_error: "LinkedIn did not return an authorization code.",
        }),
      ),
    );
  }

  try {
    const token = await exchangeCodeForToken(status.config, code);
    const author = await resolveAuthorUrn(account, token.accessToken);

    await saveSocialConnection({
      accountId: account.accountId,
      accountLabel: author.label || account.label,
      accessToken: token.accessToken,
      authorType: author.authorType,
      authorUrn: author.authorUrn,
      expiresAt: token.expiresAt,
      platform: "LinkedIn",
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scopes: token.scope ? token.scope.split(" ") : account.scopes,
    });

    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          linkedin: "connected",
          linkedin_account: account.accountId,
        }),
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LinkedIn connection failed.";
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, { linkedin_error: message }),
      ),
    );
  }
}
