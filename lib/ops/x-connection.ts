import "server-only";

import { refreshAccessToken } from "@/lib/ops/x-client";
import type { XAccountConfig, XResolvedConfig } from "@/lib/ops/x-config";
import {
  connectionExpired,
  decryptAccessToken,
  decryptRefreshToken,
  loadSocialConnection,
  updateSocialConnectionTokens,
} from "@/lib/ops/social-connections-db";

export type XConnectionError = {
  code: "not_connected" | "expired_no_refresh" | "refresh_failed" | "load_failed";
  message: string;
};

export type XReadyConnection = {
  accessToken: string;
  authorUrn: string;
  accountLabel: string;
};

export async function getReadyXConnection(
  config: XResolvedConfig,
  account: XAccountConfig,
): Promise<
  | { ok: true; value: XReadyConnection }
  | { ok: false; error: XConnectionError }
> {
  let connection;

  try {
    connection = await loadSocialConnection("X", account.accountId);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "load_failed",
        message:
          error instanceof Error ? error.message : "Failed to load X connection.",
      },
    };
  }

  if (!connection) {
    return {
      ok: false,
      error: {
        code: "not_connected",
        message: `X account ${account.label} is not connected.`,
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
            "X access token expired and no refresh token is stored. Reconnect the account.",
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
          message: `Reconnect X: ${
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
