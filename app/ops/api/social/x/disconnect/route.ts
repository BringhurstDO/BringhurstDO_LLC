import { NextResponse, type NextRequest } from "next/server";

import { deleteSocialConnection } from "@/lib/ops/social-connections-db";
import { findXAccount, resolveXConfig } from "@/lib/ops/x-config";

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
  const config = resolveXConfig();

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

  const account = findXAccount(config.config, accountId);

  if (!account) {
    return jsonNoStore({ error: `Unknown X account: ${accountId}` }, 400);
  }

  try {
    await deleteSocialConnection("X", account.accountId);
    return jsonNoStore({ accountId: account.accountId, disconnected: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect X.";
    return jsonNoStore({ error: message }, 502);
  }
}
