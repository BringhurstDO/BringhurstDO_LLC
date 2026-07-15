import { NextResponse } from "next/server";

import { resolveXConfig } from "@/lib/ops/x-config";
import { getReadyXConnection } from "@/lib/ops/x-connection";
import {
  connectionExpired,
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
  const config = resolveXConfig();

  if (!config.ok) {
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: false,
      disabledReason: config.reason,
      oauthImplemented: true,
      oauthRedirectUri: null,
      oauthScopes: [],
      platform: "X",
    };
    return jsonNoStore(response);
  }

  try {
    const accounts = await Promise.all(
      config.config.accounts.map(async (account) => {
        let record = await loadSocialConnection("X", account.accountId);
        let disabledReason: string | null = null;

        // Report the durable OAuth connection instead of treating each
        // short-lived X access token as a disconnected account.
        if (record && connectionExpired(record)) {
          const ready = await getReadyXConnection(config.config, account);

          if (ready.ok) {
            record = await loadSocialConnection("X", account.accountId);
          } else {
            disabledReason = ready.error.message;
          }
        }

        return toPublicConnectionStatus(
          "X",
          account,
          true,
          disabledReason,
          record,
        );
      }),
    );

    const response: SocialConnectionsStatusResponse = {
      accounts,
      configured: true,
      disabledReason: null,
      oauthImplemented: true,
      oauthRedirectUri: config.config.redirectUri,
      oauthScopes: config.config.accounts[0]?.scopes ?? [],
      platform: "X",
    };
    return jsonNoStore(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load X connection status.";
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: true,
      disabledReason: message,
      oauthImplemented: true,
      oauthRedirectUri: config.config.redirectUri,
      oauthScopes: config.config.accounts[0]?.scopes ?? [],
      platform: "X",
    };
    return jsonNoStore(response);
  }
}
