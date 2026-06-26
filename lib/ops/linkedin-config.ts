import "server-only";

import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import { socialTokenSecretConfigured } from "@/lib/ops/social-crypto";
import type { SocialAuthorType } from "@/lib/ops/types";

// Server-only LinkedIn integration config.
//
// Phase 7A enabled a single account. Phase 7B generalizes this to an allowlist
// of connectable accounts (founder + brand pages) for founder-first
// amplification, while staying fail-closed: unless OPS_LINKEDIN_ENABLED=true and
// every required value is present, the integration reports itself disabled and
// no OAuth, publish, or reshare call can run. Secrets never leave the server.

export const LINKEDIN_DEFAULT_API_VERSION = "202605";

export const LINKEDIN_AUTHORIZATION_URL =
  "https://www.linkedin.com/oauth/v2/authorization";
export const LINKEDIN_TOKEN_URL =
  "https://www.linkedin.com/oauth/v2/accessToken";
export const LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts";
export const LINKEDIN_IMAGES_URL = "https://api.linkedin.com/rest/images";
export const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export const LINKEDIN_DEFAULT_ACCOUNT_ID = "account-bringhurstdo-linkedin";

/**
 * Scopes requested at connect time. Organization (company page) posting needs
 * w_organization_social; member posting needs w_member_social. openid/profile
 * provide the member URN used for member-mode posting.
 */
export function scopesForAuthorType(authorType: SocialAuthorType) {
  if (authorType === "organization") {
    return ["w_organization_social", "r_organization_social", "openid", "profile"];
  }

  return ["w_member_social", "openid", "profile"];
}

export type LinkedInAccountConfig = {
  accountId: string;
  label: string;
  authorType: SocialAuthorType;
  organizationUrn: string | null;
  scopes: string[];
};

export type LinkedInResolvedConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion: string;
  accounts: LinkedInAccountConfig[];
};

export type LinkedInConfigStatus =
  | { ok: true; config: LinkedInResolvedConfig }
  | { ok: false; reason: string };

function envEnabled() {
  return process.env.OPS_LINKEDIN_ENABLED?.trim().toLowerCase() === "true";
}

function normalizeAuthorType(raw: unknown): SocialAuthorType {
  return typeof raw === "string" && raw.trim().toLowerCase() === "member"
    ? "member"
    : "organization";
}

function buildAccount(input: {
  accountId: string;
  label?: string;
  authorType: SocialAuthorType;
  organizationUrn?: string | null;
}): LinkedInAccountConfig {
  return {
    accountId: input.accountId,
    authorType: input.authorType,
    label: input.label?.trim() || input.accountId,
    organizationUrn: input.organizationUrn?.trim() || null,
    scopes: scopesForAuthorType(input.authorType),
  };
}

/**
 * Parse the multi-account allowlist from LINKEDIN_ACCOUNTS (JSON array), or fall
 * back to the single-account env vars from Phase 7A.
 */
function parseAccounts():
  | { ok: true; accounts: LinkedInAccountConfig[] }
  | { ok: false; reason: string } {
  const raw = process.env.LINKEDIN_ACCOUNTS?.trim();

  if (raw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "LINKEDIN_ACCOUNTS is not valid JSON." };
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        ok: false,
        reason: "LINKEDIN_ACCOUNTS must be a non-empty JSON array.",
      };
    }

    const accounts: LinkedInAccountConfig[] = [];

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        return { ok: false, reason: "Each LINKEDIN_ACCOUNTS entry must be an object." };
      }

      const record = entry as {
        accountId?: unknown;
        label?: unknown;
        authorType?: unknown;
        organizationUrn?: unknown;
      };
      const accountId =
        typeof record.accountId === "string" ? record.accountId.trim() : "";

      if (!accountId) {
        return { ok: false, reason: "Each LINKEDIN_ACCOUNTS entry needs an accountId." };
      }

      const authorType = normalizeAuthorType(record.authorType);
      const organizationUrn =
        typeof record.organizationUrn === "string"
          ? record.organizationUrn.trim()
          : "";

      if (authorType === "organization" && !organizationUrn) {
        return {
          ok: false,
          reason: `LINKEDIN_ACCOUNTS entry ${accountId} is organization type and needs an organizationUrn.`,
        };
      }

      accounts.push(
        buildAccount({
          accountId,
          authorType,
          label: typeof record.label === "string" ? record.label : undefined,
          organizationUrn,
        }),
      );
    }

    const ids = new Set(accounts.map((account) => account.accountId));
    if (ids.size !== accounts.length) {
      return { ok: false, reason: "LINKEDIN_ACCOUNTS has duplicate accountId values." };
    }

    return { ok: true, accounts };
  }

  // Fallback: single-account config from Phase 7A env vars.
  const authorType = normalizeAuthorType(process.env.LINKEDIN_AUTHOR_TYPE);
  const organizationUrn = process.env.LINKEDIN_ORGANIZATION_URN?.trim() || "";

  if (authorType === "organization" && !organizationUrn) {
    return {
      ok: false,
      reason:
        "LINKEDIN_ORGANIZATION_URN is required when LINKEDIN_AUTHOR_TYPE is organization (e.g. urn:li:organization:123456).",
    };
  }

  return {
    ok: true,
    accounts: [
      buildAccount({
        accountId:
          process.env.LINKEDIN_ACCOUNT_ID?.trim() || LINKEDIN_DEFAULT_ACCOUNT_ID,
        authorType,
        label: process.env.LINKEDIN_ACCOUNT_LABEL?.trim() || "BringhurstDO LinkedIn",
        organizationUrn,
      }),
    ],
  };
}

/**
 * Resolve full server-side config or a precise reason it is unavailable.
 * Never throws and never logs secret values.
 */
export function resolveLinkedInConfig(): LinkedInConfigStatus {
  if (!envEnabled()) {
    return {
      ok: false,
      reason:
        "OPS_LINKEDIN_ENABLED is not true. Set it to true after explicit approval.",
    };
  }

  if (!databasePersistenceConfigured()) {
    return {
      ok: false,
      reason:
        "LinkedIn publishing requires durable storage. Set OPS_STORAGE_MODE=database and DATABASE_URL.",
    };
  }

  if (!socialTokenSecretConfigured()) {
    return {
      ok: false,
      reason:
        "OPS_SOCIAL_TOKEN_SECRET is not configured (require at least 16 characters).",
    };
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return {
      ok: false,
      reason:
        "LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI must all be set.",
    };
  }

  const accounts = parseAccounts();

  if (!accounts.ok) {
    return { ok: false, reason: accounts.reason };
  }

  const apiVersion =
    process.env.LINKEDIN_API_VERSION?.trim() || LINKEDIN_DEFAULT_API_VERSION;

  return {
    ok: true,
    config: {
      accounts: accounts.accounts,
      apiVersion,
      clientId,
      clientSecret,
      redirectUri,
    },
  };
}

export function requireLinkedInConfig(): LinkedInResolvedConfig {
  const status = resolveLinkedInConfig();

  if (!status.ok) {
    throw new Error(status.reason);
  }

  return status.config;
}

export function findLinkedInAccount(
  config: LinkedInResolvedConfig,
  accountId: string,
): LinkedInAccountConfig | null {
  return config.accounts.find((account) => account.accountId === accountId) ?? null;
}
