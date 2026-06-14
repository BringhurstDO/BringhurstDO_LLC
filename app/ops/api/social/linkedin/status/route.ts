import { NextResponse } from "next/server";

import { resolveLinkedInConfig } from "@/lib/ops/linkedin-config";
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
  const config = resolveLinkedInConfig();

  if (!config.ok) {
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: false,
      disabledReason: config.reason,
      platform: "LinkedIn",
    };
    return jsonNoStore(response);
  }

  try {
    const accounts = await Promise.all(
      config.config.accounts.map(async (account) => {
        const record = await loadSocialConnection("LinkedIn", account.accountId);
        return toPublicConnectionStatus(
          "LinkedIn",
          account,
          true,
          null,
          record,
        );
      }),
    );

    const response: SocialConnectionsStatusResponse = {
      accounts,
      configured: true,
      disabledReason: null,
      platform: "LinkedIn",
    };
    return jsonNoStore(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load LinkedIn status.";
    const response: SocialConnectionsStatusResponse = {
      accounts: [],
      configured: true,
      disabledReason: message,
      platform: "LinkedIn",
    };
    return jsonNoStore(response);
  }
}
