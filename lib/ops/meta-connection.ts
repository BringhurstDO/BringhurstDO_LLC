import "server-only";

import type { MetaAccountConfig, MetaResolvedConfig } from "@/lib/ops/meta-config";
import { findLinkedFacebookPageAccount } from "@/lib/ops/meta-config";
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

export type MetaReadyInstagramConnection = MetaReadyConnection & {
  instagramBusinessAccountId: string;
  linkedPageAccountId: string;
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

export async function getReadyInstagramPublishConnection(
  config: MetaResolvedConfig,
  account: MetaAccountConfig,
): Promise<
  | { ok: true; value: MetaReadyInstagramConnection }
  | { ok: false; error: MetaConnectionError }
> {
  if (account.kind !== "instagram_business") {
    return {
      ok: false,
      error: {
        code: "load_failed",
        message: "This Meta account is not configured as an Instagram target.",
      },
    };
  }

  if (!account.instagramBusinessAccountId) {
    return {
      ok: false,
      error: {
        code: "load_failed",
        message: "instagramBusinessAccountId is missing for this Instagram account.",
      },
    };
  }

  const linkedPage = findLinkedFacebookPageAccount(config, account);

  if (!linkedPage) {
    return {
      ok: false,
      error: {
        code: "not_connected",
        message:
          "Linked Facebook Page is not configured in META_ACCOUNTS for this Instagram account.",
      },
    };
  }

  const ready = await getReadyMetaConnection(linkedPage);

  if (!ready.ok) {
    return ready;
  }

  return {
    ok: true,
    value: {
      ...ready.value,
      authorUrn: account.instagramBusinessAccountId,
      instagramBusinessAccountId: account.instagramBusinessAccountId,
      kind: "instagram_business",
      linkedPageAccountId: linkedPage.accountId,
    },
  };
}
