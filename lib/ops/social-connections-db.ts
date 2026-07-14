import "server-only";

import { neon } from "@neondatabase/serverless";

import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import {
  decryptSocialToken,
  encryptSocialToken,
} from "@/lib/ops/social-crypto";
import type {
  SocialConnectionPlatform,
  SocialConnectionPublicStatus,
  SocialConnectionRecord,
  SocialPublishLogRecord,
} from "@/lib/ops/types";

// Server-only storage for social OAuth connections and the publish audit log.
// Access/refresh tokens are encrypted at rest and never returned to the client.

const EXPIRY_SKEW_MS = 5 * 60 * 1000;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

function queryClient() {
  return neon(getDatabaseUrl());
}

function connectionId(platform: SocialConnectionPlatform, accountId: string) {
  return `social-${platform.toLowerCase()}-${accountId}`;
}

export type StoredTokenInput = {
  platform: SocialConnectionPlatform;
  accountId: string;
  accountLabel: string;
  authorType: SocialConnectionRecord["authorType"];
  authorUrn: string;
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  expiresAt: string;
  refreshTokenExpiresAt: string | null;
};

export async function saveSocialConnection(input: StoredTokenInput) {
  if (!databasePersistenceConfigured()) {
    throw new Error("Durable storage is not configured for social connections.");
  }

  const now = new Date().toISOString();
  const id = connectionId(input.platform, input.accountId);
  const record: SocialConnectionRecord = {
    accessTokenCipher: encryptSocialToken(input.accessToken),
    accountId: input.accountId,
    accountLabel: input.accountLabel,
    authorType: input.authorType,
    authorUrn: input.authorUrn,
    connectedAt: now,
    expiresAt: input.expiresAt,
    id,
    platform: input.platform,
    refreshTokenCipher: input.refreshToken
      ? encryptSocialToken(input.refreshToken)
      : null,
    refreshTokenExpiresAt: input.refreshTokenExpiresAt,
    scopes: input.scopes,
    sourceBoundary:
      "BringhurstDO Ops social OAuth connection. Encrypted tokens only; never returned to the browser.",
    updatedAt: now,
  };

  const sql = queryClient();

  await sql.query(
    `insert into ops_social_connections
      (id, platform, account_id, author_type, author_urn, created_at, updated_at, schema_version, source_boundary, data)
     values ($1, $2, $3, $4, $5, $6, $6, 1, $7, $8::jsonb)
     on conflict (id) do update set
      platform = excluded.platform,
      account_id = excluded.account_id,
      author_type = excluded.author_type,
      author_urn = excluded.author_urn,
      updated_at = excluded.updated_at,
      schema_version = excluded.schema_version,
      source_boundary = excluded.source_boundary,
      data = excluded.data`,
    [
      record.id,
      record.platform,
      record.accountId,
      record.authorType,
      record.authorUrn,
      now,
      record.sourceBoundary,
      JSON.stringify(record),
    ],
  );

  return record;
}

export async function loadSocialConnection(
  platform: SocialConnectionPlatform,
  accountId: string,
): Promise<SocialConnectionRecord | null> {
  if (!databasePersistenceConfigured()) {
    return null;
  }

  const sql = queryClient();
  const rows = (await sql.query(
    `select data from ops_social_connections where id = $1 limit 1`,
    [connectionId(platform, accountId)],
  )) as { data: SocialConnectionRecord }[];

  return rows[0]?.data ?? null;
}

export async function deleteSocialConnection(
  platform: SocialConnectionPlatform,
  accountId: string,
) {
  if (!databasePersistenceConfigured()) {
    return { deleted: false };
  }

  const sql = queryClient();
  await sql.query(`delete from ops_social_connections where id = $1`, [
    connectionId(platform, accountId),
  ]);

  return { deleted: true };
}

/**
 * Update only the token fields after a refresh, preserving connection metadata.
 */
export async function updateSocialConnectionTokens(
  record: SocialConnectionRecord,
  update: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt: string;
    refreshTokenExpiresAt?: string | null;
  },
) {
  const now = new Date().toISOString();
  const next: SocialConnectionRecord = {
    ...record,
    accessTokenCipher: encryptSocialToken(update.accessToken),
    expiresAt: update.expiresAt,
    refreshTokenCipher:
      update.refreshToken === undefined
        ? record.refreshTokenCipher
        : update.refreshToken
          ? encryptSocialToken(update.refreshToken)
          : null,
    refreshTokenExpiresAt:
      update.refreshTokenExpiresAt === undefined
        ? record.refreshTokenExpiresAt
        : update.refreshTokenExpiresAt,
    updatedAt: now,
  };

  const sql = queryClient();
  await sql.query(
    `update ops_social_connections
       set updated_at = $2, data = $3::jsonb
     where id = $1`,
    [next.id, now, JSON.stringify(next)],
  );

  return next;
}

export function decryptAccessToken(record: SocialConnectionRecord) {
  return decryptSocialToken(record.accessTokenCipher);
}

export function decryptRefreshToken(record: SocialConnectionRecord) {
  return record.refreshTokenCipher
    ? decryptSocialToken(record.refreshTokenCipher)
    : null;
}

export function connectionExpired(record: SocialConnectionRecord) {
  const expiresAtMs = Date.parse(record.expiresAt);

  if (Number.isNaN(expiresAtMs)) {
    return true;
  }

  return expiresAtMs - EXPIRY_SKEW_MS <= Date.now();
}

function maskAuthorUrn(authorUrn: string) {
  const id = authorUrn.split(":").pop() ?? "";

  if (id.length <= 4) {
    return id ? `***${id}` : null;
  }

  return `***${id.slice(-4)}`;
}

/**
 * Browser-safe status derived from a stored record. Never includes tokens.
 */
export function toPublicConnectionStatus(
  platform: SocialConnectionPlatform,
  account: {
    accountId: string;
    label: string;
    authorType: SocialConnectionRecord["authorType"];
  },
  configured: boolean,
  disabledReason: string | null,
  record: SocialConnectionRecord | null,
): SocialConnectionPublicStatus {
  const base = {
    accountId: account.accountId,
    configuredAuthorType: account.authorType,
    configuredLabel: account.label,
    disabledReason,
    manualApprovalRequired: true as const,
    platform,
  };

  if (!record) {
    return {
      ...base,
      accountLabel: null,
      authorIdMasked: null,
      authorType: null,
      configured,
      connected: false,
      connectedAt: null,
      expired: false,
      expiresAt: null,
      scopes: [],
    };
  }

  return {
    ...base,
    accountLabel: record.accountLabel,
    authorIdMasked: maskAuthorUrn(record.authorUrn),
    authorType: record.authorType,
    configured,
    connected: !connectionExpired(record),
    connectedAt: record.connectedAt,
    expired: connectionExpired(record),
    expiresAt: record.expiresAt,
    scopes: record.scopes,
  };
}

export async function saveSocialPublishLog(record: SocialPublishLogRecord) {
  if (!databasePersistenceConfigured()) {
    return { persisted: false };
  }

  const sql = queryClient();
  const now = record.createdAt;

  await sql.query(
    `insert into ops_social_publish_log
      (id, platform, content_package_id, platform_draft_id, status, created_at, updated_at, schema_version, source_boundary, data)
     values ($1, $2, $3, $4, $5, $6, $6, 1, $7, $8::jsonb)
     on conflict (id) do update set
      status = excluded.status,
      updated_at = excluded.updated_at,
      source_boundary = excluded.source_boundary,
      data = excluded.data`,
    [
      record.id,
      record.platform,
      record.contentPackageId,
      record.platformDraftId,
      record.status,
      now,
      record.sourceBoundary,
      JSON.stringify(record),
    ],
  );

  return { persisted: true };
}

export async function listSuccessfulSocialPublishLogs(): Promise<
  SocialPublishLogRecord[]
> {
  if (!databasePersistenceConfigured()) {
    return [];
  }

  const sql = queryClient();
  const rows = await sql.query(
    `select data
     from ops_social_publish_log
     where status = 'success'
     order by created_at asc`,
  );

  return rows
    .map((row) => row.data as SocialPublishLogRecord)
    .filter((record) => record && typeof record === "object" && record.id);
}
