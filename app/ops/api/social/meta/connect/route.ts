import { NextResponse, type NextRequest } from "next/server";

import { findMetaAccount, resolveMetaConfig } from "@/lib/ops/meta-config";

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
  const status = resolveMetaConfig();

  if (!status.ok) {
    return NextResponse.redirect(
      accountsRedirect(request, { meta_error: status.reason }),
    );
  }

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

  return NextResponse.redirect(
    accountsRedirect(request, {
      meta_error:
        "Phase 9 scaffold: Meta OAuth connect is not implemented yet. Complete Meta Business verification/app review first, then wire callback and publish routes.",
    }),
  );
}
