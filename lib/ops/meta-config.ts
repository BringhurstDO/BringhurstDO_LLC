import "server-only";

import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import { socialTokenSecretConfigured } from "@/lib/ops/social-crypto";
import type { SocialAuthorType } from "@/lib/ops/types";

// Phase 9: Meta (Facebook Page + Instagram Business) OAuth and Facebook publish.

export type MetaAccountKind = "facebook_page" | "instagram_business";

export type MetaAccountConfig = {
  accountId: string;
  label: string;
  kind: MetaAccountKind;
  authorType: SocialAuthorType;
  pageId: string | null;
  instagramBusinessAccountId: string | null;
  scopes: string[];
};

export type MetaResolvedConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  /** Facebook Login for Business configuration ID (preferred over scope on Business apps). */
  loginConfigId: string | null;
  accounts: MetaAccountConfig[];
};

export type MetaConfigStatus =
  | { ok: true; config: MetaResolvedConfig }
  | { ok: false; reason: string };

const FACEBOOK_PAGE_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "read_insights",
  // IG insights/publish use the linked Page token, so Page connect must request these.
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "business_management",
];

const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "business_management",
];

function envEnabled() {
  return process.env.OPS_META_ENABLED?.trim().toLowerCase() === "true";
}

function normalizeKind(raw: unknown): MetaAccountKind {
  return typeof raw === "string" &&
    raw.trim().toLowerCase() === "instagram_business"
    ? "instagram_business"
    : "facebook_page";
}

function parseAccounts():
  | { ok: true; accounts: MetaAccountConfig[] }
  | { ok: false; reason: string } {
  const raw = process.env.META_ACCOUNTS?.trim();

  if (!raw) {
    return {
      ok: false,
      reason:
        "META_ACCOUNTS is not set. Provide a JSON array of Meta account objects.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "META_ACCOUNTS is not valid JSON." };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, reason: "META_ACCOUNTS must be a non-empty JSON array." };
  }

  const accounts: MetaAccountConfig[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, reason: "Each META_ACCOUNTS entry must be an object." };
    }

    const record = entry as {
      accountId?: unknown;
      label?: unknown;
      kind?: unknown;
      pageId?: unknown;
      instagramBusinessAccountId?: unknown;
    };
    const accountId =
      typeof record.accountId === "string" ? record.accountId.trim() : "";

    if (!accountId) {
      return { ok: false, reason: "Each META_ACCOUNTS entry needs an accountId." };
    }

    const kind = normalizeKind(record.kind);
    const pageId =
      typeof record.pageId === "string" ? record.pageId.trim() || null : null;
    const instagramBusinessAccountId =
      typeof record.instagramBusinessAccountId === "string"
        ? record.instagramBusinessAccountId.trim() || null
        : null;

    if (kind === "facebook_page" && !pageId) {
      return {
        ok: false,
        reason: `META_ACCOUNTS entry ${accountId} (facebook_page) needs pageId.`,
      };
    }

    if (kind === "instagram_business" && !instagramBusinessAccountId) {
      return {
        ok: false,
        reason: `META_ACCOUNTS entry ${accountId} (instagram_business) needs instagramBusinessAccountId.`,
      };
    }

    accounts.push({
      accountId,
      authorType: "organization",
      instagramBusinessAccountId,
      kind,
      label:
        typeof record.label === "string" ? record.label.trim() || accountId : accountId,
      pageId,
      scopes: kind === "instagram_business" ? INSTAGRAM_SCOPES : FACEBOOK_PAGE_SCOPES,
    });
  }

  const ids = new Set(accounts.map((account) => account.accountId));
  if (ids.size !== accounts.length) {
    return { ok: false, reason: "META_ACCOUNTS has duplicate accountId values." };
  }

  return { ok: true, accounts };
}

export function resolveMetaConfig(): MetaConfigStatus {
  if (!envEnabled()) {
    return {
      ok: false,
      reason:
        "OPS_META_ENABLED is not true. Set it to true after Meta Business verification and app review.",
    };
  }

  if (!databasePersistenceConfigured()) {
    return {
      ok: false,
      reason:
        "Meta connections require durable storage. Set OPS_STORAGE_MODE=database and DATABASE_URL.",
    };
  }

  if (!socialTokenSecretConfigured()) {
    return {
      ok: false,
      reason:
        "OPS_SOCIAL_TOKEN_SECRET is not configured (require at least 16 characters).",
    };
  }

  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();

  if (!appId || !appSecret || !redirectUri) {
    return {
      ok: false,
      reason:
        "META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI must all be set.",
    };
  }

  const accounts = parseAccounts();
  if (!accounts.ok) {
    return { ok: false, reason: accounts.reason };
  }

  const loginConfigId = process.env.META_LOGIN_CONFIG_ID?.trim() || null;

  return {
    ok: true,
    config: {
      accounts: accounts.accounts,
      appId,
      appSecret,
      loginConfigId,
      redirectUri,
    },
  };
}

export function findMetaAccount(config: MetaResolvedConfig, accountId: string) {
  return config.accounts.find((account) => account.accountId === accountId) ?? null;
}

export function findLinkedFacebookPageAccount(
  config: MetaResolvedConfig,
  instagramAccount: MetaAccountConfig,
) {
  if (instagramAccount.kind !== "instagram_business" || !instagramAccount.pageId) {
    return null;
  }

  return (
    config.accounts.find(
      (account) =>
        account.kind === "facebook_page" &&
        account.pageId === instagramAccount.pageId,
    ) ?? null
  );
}
