import { NextResponse } from "next/server";

import { resolveXConfig } from "@/lib/ops/x-config";
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
  const config = resolveXConfig();

  if (!config.ok) {
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: false,
      disabledReason: config.reason,
      oauthImplemented: true,
      platform: "X",
    };
    return jsonNoStore(response);
  }

  try {
    const accounts = await Promise.all(
      config.config.accounts.map(async (account) => {
        const record = await loadSocialConnection("X", account.accountId);
        return toPublicConnectionStatus("X", account, true, null, record);
      }),
    );

    const response: SocialConnectionsStatusResponse = {
      accounts,
      configured: true,
      disabledReason: null,
      oauthImplemented: true,
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
      platform: "X",
    };
    return jsonNoStore(response);
  }
}
