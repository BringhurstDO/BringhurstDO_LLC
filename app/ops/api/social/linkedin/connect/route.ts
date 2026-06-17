import { NextResponse, type NextRequest } from "next/server";

import { oauthCookieOptions } from "@/lib/ops/oauth-cookie-options";
import { redirectToCanonicalOpsOrigin } from "@/lib/ops/ops-public-origin";
import { buildAuthorizationUrl } from "@/lib/ops/linkedin-client";
import {
  findLinkedInAccount,
  resolveLinkedInConfig,
} from "@/lib/ops/linkedin-config";
import {
  createOAuthState,
  LINKEDIN_OAUTH_ACCOUNT_COOKIE,
  LINKEDIN_OAUTH_STATE_COOKIE,
  LINKEDIN_OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/lib/ops/linkedin-oauth-state";

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

  const status = resolveLinkedInConfig();

  if (!status.ok) {
    return NextResponse.redirect(
      accountsRedirect(request, { linkedin_error: status.reason }),
    );
  }

  const requestedAccountId =
    request.nextUrl.searchParams.get("account")?.trim() ||
    status.config.accounts[0]?.accountId ||
    "";
  const account = findLinkedInAccount(status.config, requestedAccountId);

  if (!account) {
    return NextResponse.redirect(
      accountsRedirect(request, {
        linkedin_error: `Unknown LinkedIn account: ${requestedAccountId}`,
      }),
    );
  }

  const state = createOAuthState();
  const authorizationUrl = buildAuthorizationUrl(status.config, account, state);

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = oauthCookieOptions(
    request,
    LINKEDIN_OAUTH_STATE_MAX_AGE_SECONDS,
  );
  response.cookies.set(LINKEDIN_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(
    LINKEDIN_OAUTH_ACCOUNT_COOKIE,
    account.accountId,
    cookieOptions,
  );
  response.headers.set("Cache-Control", "no-store");

  return response;
}
