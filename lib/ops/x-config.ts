import "server-only";

import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import { socialTokenSecretConfigured } from "@/lib/ops/social-crypto";
import type { SocialAuthorType } from "@/lib/ops/types";

// Phase 9: X (Twitter) OAuth 2.0 + manual-approved posting. Fail-closed until
// explicitly enabled and every required value is present.

export const X_AUTHORIZATION_URL = "https://x.com/i/oauth2/authorize";
export const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
export const X_TWEETS_URL = "https://api.twitter.com/2/tweets";
export const X_USERS_ME_URL = "https://api.twitter.com/2/users/me";

export type XAccountConfig = {
  accountId: string;
  label: string;
  authorType: SocialAuthorType;
  scopes: string[];
};

export type XResolvedConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accounts: XAccountConfig[];
};

export type XConfigStatus =
  | { ok: true; config: XResolvedConfig }
  | { ok: false; reason: string };

const DEFAULT_X_SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];
const FORBIDDEN_X_SCOPES = ["dm.read", "dm.write"];

function envEnabled() {
  return process.env.OPS_X_ENABLED?.trim().toLowerCase() === "true";
}

function parseAccounts():
  | { ok: true; accounts: XAccountConfig[] }
  | { ok: false; reason: string } {
  const raw = process.env.X_ACCOUNTS?.trim();

  if (!raw) {
    return {
      ok: false,
      reason:
        "X_ACCOUNTS is not set. Provide a JSON array of { accountId, label } objects.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "X_ACCOUNTS is not valid JSON." };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, reason: "X_ACCOUNTS must be a non-empty JSON array." };
  }

  const accounts: XAccountConfig[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, reason: "Each X_ACCOUNTS entry must be an object." };
    }

    const record = entry as { accountId?: unknown; label?: unknown };
    const accountId =
      typeof record.accountId === "string" ? record.accountId.trim() : "";

    if (!accountId) {
      return { ok: false, reason: "Each X_ACCOUNTS entry needs an accountId." };
    }

    accounts.push({
      accountId,
      authorType: "member",
      label: typeof record.label === "string" ? record.label.trim() || accountId : accountId,
      scopes: DEFAULT_X_SCOPES,
    });
  }

  const forbiddenScopes = DEFAULT_X_SCOPES.filter((scope) =>
    FORBIDDEN_X_SCOPES.includes(scope),
  );

  if (forbiddenScopes.length > 0) {
    return {
      ok: false,
      reason: `X scopes must not include direct-message access: ${forbiddenScopes.join(", ")}.`,
    };
  }

  const ids = new Set(accounts.map((account) => account.accountId));
  if (ids.size !== accounts.length) {
    return { ok: false, reason: "X_ACCOUNTS has duplicate accountId values." };
  }

  return { ok: true, accounts };
}

export function resolveXConfig(): XConfigStatus {
  if (!envEnabled()) {
    return {
      ok: false,
      reason:
        "OPS_X_ENABLED is not true. Set it to true after X API access is approved.",
    };
  }

  if (!databasePersistenceConfigured()) {
    return {
      ok: false,
      reason:
        "X connections require durable storage. Set OPS_STORAGE_MODE=database and DATABASE_URL.",
    };
  }

  if (!socialTokenSecretConfigured()) {
    return {
      ok: false,
      reason:
        "OPS_SOCIAL_TOKEN_SECRET is not configured (require at least 16 characters).",
    };
  }

  const clientId = process.env.X_CLIENT_ID?.trim();
  const clientSecret = process.env.X_CLIENT_SECRET?.trim();
  const redirectUri = process.env.X_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return {
      ok: false,
      reason:
        "X_CLIENT_ID, X_CLIENT_SECRET, and X_REDIRECT_URI must all be set.",
    };
  }

  const accounts = parseAccounts();
  if (!accounts.ok) {
    return { ok: false, reason: accounts.reason };
  }

  return {
    ok: true,
    config: {
      accounts: accounts.accounts,
      clientId,
      clientSecret,
      redirectUri,
    },
  };
}

export function findXAccount(config: XResolvedConfig, accountId: string) {
  return config.accounts.find((account) => account.accountId === accountId) ?? null;
}
