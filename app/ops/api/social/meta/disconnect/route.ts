import { NextResponse, type NextRequest } from "next/server";

import { findMetaAccount, resolveMetaConfig } from "@/lib/ops/meta-config";
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
  const config = resolveMetaConfig();

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

  const account = findMetaAccount(config.config, accountId);

  if (!account) {
    return jsonNoStore({ error: `Unknown Meta account: ${accountId}` }, 400);
  }

  try {
    await deleteSocialConnection("Meta", account.accountId);
    return jsonNoStore({ accountId: account.accountId, disconnected: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect Meta.";
    return jsonNoStore({ error: message }, 502);
  }
}
