import { NextResponse, type NextRequest } from "next/server";

import {
  findLinkedInAccount,
  resolveLinkedInConfig,
} from "@/lib/ops/linkedin-config";
import { deleteSocialConnection } from "@/lib/ops/social-connections-db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST(request: NextRequest) {
  const config = resolveLinkedInConfig();

  if (!config.ok) {
    return jsonNoStore({ error: config.reason }, 503);
  }

  let accountId = "";
  try {
    const body = (await request.json()) as { accountId?: unknown };
    accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
  } catch {
    accountId = "";
  }

  if (!accountId) {
    accountId = config.config.accounts[0]?.accountId ?? "";
  }

  const account = findLinkedInAccount(config.config, accountId);

  if (!account) {
    return jsonNoStore({ error: `Unknown LinkedIn account: ${accountId}` }, 400);
  }

  try {
    await deleteSocialConnection("LinkedIn", account.accountId);
    return jsonNoStore({ disconnected: true, accountId: account.accountId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect LinkedIn.";
    return jsonNoStore({ error: message }, 502);
  }
}
