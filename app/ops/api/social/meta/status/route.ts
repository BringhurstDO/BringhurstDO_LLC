import { NextResponse } from "next/server";

import { resolveMetaConfig } from "@/lib/ops/meta-config";
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
      oauthImplemented: false,
      platform: "Meta",
    };
    return jsonNoStore(response);
  }

  try {
    const accounts = await Promise.all(
      config.config.accounts.map(async (account) => {
        const record = await loadSocialConnection("Meta", account.accountId);
        return toPublicConnectionStatus("Meta", account, true, null, record);
      }),
    );

    const response: SocialConnectionsStatusResponse = {
      accounts,
      configured: true,
      disabledReason: null,
      oauthImplemented: false,
      platform: "Meta",
    };
    return jsonNoStore(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Meta connection status.";
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: true,
      disabledReason: message,
      oauthImplemented: false,
      platform: "Meta",
    };
    return jsonNoStore(response);
  }
}
