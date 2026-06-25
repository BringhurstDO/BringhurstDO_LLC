import { NextResponse, type NextRequest } from "next/server";

import { oauthCookieOptions } from "@/lib/ops/oauth-cookie-options";
import { redirectToCanonicalOpsOrigin } from "@/lib/ops/ops-public-origin";
import { buildAuthorizationUrl } from "@/lib/ops/meta-client";
import { findMetaAccount, resolveMetaConfig } from "@/lib/ops/meta-config";
import {
  createOAuthState,
  META_OAUTH_ACCOUNT_COOKIE,
  META_OAUTH_CONNECT_ALL_FACEBOOK_PAGES,
  META_OAUTH_STATE_COOKIE,
  META_OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/lib/ops/meta-oauth-state";

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
  const canonicalRedirect = redirectToCanonicalOpsOrigin(request);
  if (canonicalRedirect) {
    return NextResponse.redirect(canonicalRedirect, 307);
  }

  const status = resolveMetaConfig();

  if (!status.ok) {
    return NextResponse.redirect(
      accountsRedirect(request, { meta_error: status.reason }),
    );
  }

  const connectAllFacebookPages =
    request.nextUrl.searchParams.get("mode")?.trim().toLowerCase() ===
    "all-pages";

  let oauthAccountId: string;
  let scopeAccount;

  if (connectAllFacebookPages) {
    const facebookAccounts = status.config.accounts.filter(
      (account) => account.kind === "facebook_page",
    );

    if (facebookAccounts.length === 0) {
      return NextResponse.redirect(
        accountsRedirect(request, {
          meta_error:
            "No Facebook Page accounts are configured in META_ACCOUNTS.",
        }),
      );
    }

    oauthAccountId = META_OAUTH_CONNECT_ALL_FACEBOOK_PAGES;
    scopeAccount = facebookAccounts[0]!;
  } else {
    const requestedAccountId =
      request.nextUrl.searchParams.get("account")?.trim() ||
      status.config.accounts[0]?.accountId ||
      "";
    const account = findMetaAccount(status.config, requestedAccountId);

    if (!account) {
      return NextResponse.redirect(
        accountsRedirect(request, {
          meta_error: `Unknown Meta account: ${requestedAccountId}`,
        }),
      );
    }

    oauthAccountId = account.accountId;
    scopeAccount = account;
  }

  const state = createOAuthState();
  const authorizationUrl = buildAuthorizationUrl(status.config, scopeAccount, state);

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = oauthCookieOptions(
    request,
    META_OAUTH_STATE_MAX_AGE_SECONDS,
  );
  response.cookies.set(META_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(META_OAUTH_ACCOUNT_COOKIE, oauthAccountId, cookieOptions);
  response.headers.set("Cache-Control", "no-store");

  return response;
}
