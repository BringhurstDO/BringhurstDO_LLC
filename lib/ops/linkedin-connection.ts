import "server-only";

import { refreshAccessToken } from "@/lib/ops/linkedin-client";
import type {
  LinkedInAccountConfig,
  LinkedInResolvedConfig,
} from "@/lib/ops/linkedin-config";
import {
  connectionExpired,
  decryptAccessToken,
  decryptRefreshToken,
  loadSocialConnection,
  updateSocialConnectionTokens,
} from "@/lib/ops/social-connections-db";

export type LinkedInConnectionError = {
  code: "not_connected" | "expired_no_refresh" | "refresh_failed" | "load_failed";
  message: string;
};

export type LinkedInReadyConnection = {
  accessToken: string;
  authorUrn: string;
  accountLabel: string;
};

/**
 * Load an account's connection, refreshing the access token when expired.
 * Returns either a ready access token + author URN, or a typed error.
 */
export async function getReadyLinkedInConnection(
  config: LinkedInResolvedConfig,
  account: LinkedInAccountConfig,
): Promise<
  | { ok: true; value: LinkedInReadyConnection }
  | { ok: false; error: LinkedInConnectionError }
> {
  let connection;
  try {
    connection = await loadSocialConnection("LinkedIn", account.accountId);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "load_failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load LinkedIn connection.",
      },
    };
  }

  if (!connection) {
    return {
      ok: false,
      error: {
        code: "not_connected",
        message: `LinkedIn account ${account.label} is not connected.`,
      },
    };
  }

  if (connectionExpired(connection)) {
    const refreshToken = decryptRefreshToken(connection);

    if (!refreshToken) {
      return {
        ok: false,
        error: {
          code: "expired_no_refresh",
          message:
            "LinkedIn access token expired and no refresh token is stored. Reconnect the account.",
        },
      };
    }

    try {
      const refreshed = await refreshAccessToken(config, refreshToken);
      connection = await updateSocialConnectionTokens(connection, {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
        refreshToken: refreshed.refreshToken ?? refreshToken,
        refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
      });
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "refresh_failed",
          message: `Reconnect LinkedIn: ${
            error instanceof Error ? error.message : "token refresh failed."
          }`,
        },
      };
    }
  }

  return {
    ok: true,
    value: {
      accessToken: decryptAccessToken(connection),
      accountLabel: connection.accountLabel,
      authorUrn: connection.authorUrn,
    },
  };
}
