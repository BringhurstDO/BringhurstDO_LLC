import { NextResponse, type NextRequest } from "next/server";

import { oauthCookieOptions } from "@/lib/ops/oauth-cookie-options";
import {
  exchangeCodeForToken,
  exchangeLongLivedUserToken,
  resolveAllConfiguredFacebookPageAuthors,
  resolveMetaAuthor,
} from "@/lib/ops/meta-client";
import { findMetaAccount, resolveMetaConfig } from "@/lib/ops/meta-config";
import {
  isConnectAllFacebookPagesMode,
  META_OAUTH_ACCOUNT_COOKIE,
  META_OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/ops/meta-oauth-state";
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

function clearOAuthCookies(response: NextResponse, request: NextRequest) {
  const clearOptions = { ...oauthCookieOptions(request, 0), maxAge: 0 };
  for (const name of [META_OAUTH_STATE_COOKIE, META_OAUTH_ACCOUNT_COOKIE]) {
    response.cookies.set(name, "", clearOptions);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function oauthTroubleshootingHint(errorCode: string) {
  const normalized = errorCode.trim().toLowerCase();

  if (
    normalized.includes("access_denied") ||
    normalized.includes("permission")
  ) {
    return "Confirm the Facebook app has Pages permissions, Business verification is complete, and you approved all requested scopes.";
  }

  return "Reconnect from /ops/accounts and verify META_REDIRECT_URI matches the Facebook app callback exactly.";
}

export async function GET(request: NextRequest) {
  const status = resolveMetaConfig();

  if (!status.ok) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, { meta_error: status.reason }),
      ),
      request,
    );
  }

  const { searchParams } = request.nextUrl;
  const cookieAccountId =
    request.cookies.get(META_OAUTH_ACCOUNT_COOKIE)?.value ?? "";
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const description =
      searchParams.get("error_description") ??
      searchParams.get("error_reason") ??
      "Meta authorization failed.";
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          meta_error: description,
          meta_error_account: cookieAccountId || "unknown",
          meta_error_code: oauthError,
          meta_error_hint: oauthTroubleshootingHint(oauthError),
        }),
      ),
      request,
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState =
    request.cookies.get(META_OAUTH_STATE_COOKIE)?.value ?? null;

  if (!verifyOAuthState(state, cookieState)) {
    const hint = !state && !cookieState
      ? "Start Connect from https://www.bringhurstdo.com/ops/accounts, finish Facebook login in the same tab, and confirm App Domains includes bringhurstdo.com. Business apps should set META_LOGIN_CONFIG_ID from Facebook Login for Business → Configurations."
      : !state
        ? "Meta omitted state on the callback and the OAuth cookie was missing. Allow cookies for bringhurstdo.com and try Connect again without using the back button."
        : !cookieState
          ? "The OAuth cookie was missing on return from Facebook. Use https://www.bringhurstdo.com/ops/accounts, allow cookies, and try Connect again in the same browser tab."
          : "State mismatch — start Connect again from /ops/accounts in one tab without using the back button.";
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          meta_error: "OAuth state validation failed. Try connecting again.",
          meta_error_hint: hint,
        }),
      ),
      request,
    );
  }

  const account = isConnectAllFacebookPagesMode(cookieAccountId)
    ? null
    : findMetaAccount(status.config, cookieAccountId);

  if (!isConnectAllFacebookPagesMode(cookieAccountId) && !account) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          meta_error: "Connection account could not be resolved. Try again.",
        }),
      ),
      request,
    );
  }

  if (!code) {
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          meta_error: "Meta did not return an authorization code.",
        }),
      ),
      request,
    );
  }

  try {
    const shortLived = await exchangeCodeForToken(status.config, code);
    const longLived = await exchangeLongLivedUserToken(
      status.config,
      shortLived.accessToken,
    );

    if (isConnectAllFacebookPagesMode(cookieAccountId)) {
      const { authors, skipped } = await resolveAllConfiguredFacebookPageAuthors(
        status.config,
        longLived.accessToken,
      );

      if (authors.length === 0) {
        const detail =
          skipped.length > 0
            ? skipped.map((entry) => `${entry.label}: ${entry.reason}`).join(" ")
            : "No configured Facebook Pages were returned for this login.";
        throw new Error(detail);
      }

      for (const { account: pageAccount, author } of authors) {
        await saveSocialConnection({
          accessToken: author.accessToken,
          accountId: pageAccount.accountId,
          accountLabel: author.label || pageAccount.label,
          authorType: author.authorType,
          authorUrn: author.authorUrn,
          expiresAt: longLived.expiresAt,
          platform: "Meta",
          refreshToken: null,
          refreshTokenExpiresAt: null,
          scopes: pageAccount.scopes,
        });
      }

      const redirectParams: Record<string, string> = {
        meta: "connected_all",
        meta_connected: String(authors.length),
      };

      if (skipped.length > 0) {
        redirectParams.meta_skipped = String(skipped.length);
        redirectParams.meta_error_hint = skipped
          .map((entry) => `${entry.label}: ${entry.reason}`)
          .join(" ");
      }

      return clearOAuthCookies(
        NextResponse.redirect(accountsRedirect(request, redirectParams)),
        request,
      );
    }

    const author = await resolveMetaAuthor(account!, longLived.accessToken);

    await saveSocialConnection({
      accessToken: author.accessToken,
      accountId: account!.accountId,
      accountLabel: author.label || account!.label,
      authorType: author.authorType,
      authorUrn: author.authorUrn,
      expiresAt: longLived.expiresAt,
      platform: "Meta",
      refreshToken: null,
      refreshTokenExpiresAt: null,
      scopes: account!.scopes,
    });

    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          meta: "connected",
          meta_account: account!.accountId,
        }),
      ),
      request,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Meta connection failed.";
    const lower = message.toLowerCase();
    const hint =
      lower.includes("page") || lower.includes("instagram")
        ? "Verify you are admin on the configured Page and that pageId / instagramBusinessAccountId in META_ACCOUNTS match Meta Business settings."
        : "Connection reached callback, but token or page resolution failed.";
    return clearOAuthCookies(
      NextResponse.redirect(
        accountsRedirect(request, {
          meta_error: message,
          meta_error_account: cookieAccountId || "unknown",
          meta_error_code: "callback_exchange_failed",
          meta_error_hint: hint,
        }),
      ),
      request,
    );
  }
}
