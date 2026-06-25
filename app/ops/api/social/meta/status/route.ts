import { NextResponse } from "next/server";

import {
  findLinkedFacebookPageAccount,
  resolveMetaConfig,
} from "@/lib/ops/meta-config";
import {
  loadSocialConnection,
  toPublicConnectionStatus,
} from "@/lib/ops/social-connections-db";
import type { SocialConnectionsStatusResponse } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function GET() {
  const config = resolveMetaConfig();

  if (!config.ok) {
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: false,
      disabledReason: config.reason,
      oauthImplemented: true,
      platform: "Meta",
    };
    return jsonNoStore(response);
  }

  const oauthScopes = Array.from(
    new Set(config.config.accounts.flatMap((account) => account.scopes)),
  );

  try {
    const accounts = await Promise.all(
      config.config.accounts.map(async (account) => {
        const linkedPage =
          account.kind === "instagram_business"
            ? findLinkedFacebookPageAccount(config.config, account)
            : null;
        const record = await loadSocialConnection(
          "Meta",
          linkedPage?.accountId ?? account.accountId,
        );
        return toPublicConnectionStatus("Meta", account, true, null, record);
      }),
    );

    const response: SocialConnectionsStatusResponse = {
      accounts,
      configured: true,
      disabledReason: null,
      oauthImplemented: true,
      oauthRedirectUri: config.config.redirectUri,
      oauthScopes,
      platform: "Meta",
    };
    return jsonNoStore(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Meta status.";
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: true,
      disabledReason: message,
      oauthImplemented: true,
      oauthRedirectUri: config.config.redirectUri,
      oauthScopes,
      platform: "Meta",
    };
    return jsonNoStore(response);
  }
}
