import "server-only";

import type { MetaAccountConfig } from "@/lib/ops/meta-config";
import {
  connectionExpired,
  decryptAccessToken,
  loadSocialConnection,
} from "@/lib/ops/social-connections-db";

export type MetaConnectionError = {
  code: "not_connected" | "expired" | "load_failed";
  message: string;
};

export type MetaReadyConnection = {
  accessToken: string;
  accountLabel: string;
  authorUrn: string;
  kind: MetaAccountConfig["kind"];
};

export async function getReadyMetaConnection(
  account: MetaAccountConfig,
): Promise<
  | { ok: true; value: MetaReadyConnection }
  | { ok: false; error: MetaConnectionError }
> {
  let connection;

  try {
    connection = await loadSocialConnection("Meta", account.accountId);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "load_failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Meta connection.",
      },
    };
  }

  if (!connection) {
    return {
      ok: false,
      error: {
        code: "not_connected",
        message: `Meta account ${account.label} is not connected.`,
      },
    };
  }

  if (connectionExpired(connection)) {
    return {
      ok: false,
      error: {
        code: "expired",
        message:
          "Meta page token expired or is near expiry. Reconnect the account on /ops/accounts.",
      },
    };
  }

  return {
    ok: true,
    value: {
      accessToken: decryptAccessToken(connection),
      accountLabel: connection.accountLabel,
      authorUrn: connection.authorUrn,
      kind: account.kind,
    },
  };
}
