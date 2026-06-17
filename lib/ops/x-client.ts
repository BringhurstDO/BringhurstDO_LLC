import "server-only";

import {
  type XAccountConfig,
  type XResolvedConfig,
  X_AUTHORIZATION_URL,
  X_TOKEN_URL,
  X_TWEETS_URL,
  X_USERS_ME_URL,
} from "@/lib/ops/x-config";
import type { SocialAuthorType } from "@/lib/ops/types";

export type XTokenResult = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  refreshTokenExpiresAt: string | null;
  scope: string;
};

function expiresAtFromSeconds(seconds: number | undefined) {
  const safeSeconds = typeof seconds === "number" && seconds > 0 ? seconds : 0;
  return new Date(Date.now() + safeSeconds * 1000).toISOString();
}

function basicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildAuthorizationUrl(
  config: XResolvedConfig,
  account: XAccountConfig,
  state: string,
  codeChallenge: string,
) {
  // encodeURIComponent keeps scope spaces as %20; URLSearchParams uses "+" which
  // some OAuth providers reject.
  const params: Array<[string, string]> = [
    ["response_type", "code"],
    ["client_id", config.clientId],
    ["redirect_uri", config.redirectUri],
    ["scope", account.scopes.join(" ")],
    ["state", state],
    ["code_challenge", codeChallenge],
    ["code_challenge_method", "S256"],
  ];

  const query = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return `${X_AUTHORIZATION_URL}?${query}`;
}

async function requestToken(
  config: XResolvedConfig,
  body: URLSearchParams,
): Promise<XTokenResult> {
  const response = await fetch(X_TOKEN_URL, {
    body: body.toString(),
    headers: {
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `X token request failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const json = JSON.parse(text) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };

  return {
    accessToken: json.access_token,
    expiresAt: expiresAtFromSeconds(json.expires_in),
    refreshToken: json.refresh_token ?? null,
    refreshTokenExpiresAt: null,
    scope: json.scope ?? "",
  };
}

export async function exchangeCodeForToken(
  config: XResolvedConfig,
  code: string,
  codeVerifier: string,
): Promise<XTokenResult> {
  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
  });

  return requestToken(config, body);
}

export async function refreshAccessToken(
  config: XResolvedConfig,
  refreshToken: string,
): Promise<XTokenResult> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
  });

  return requestToken(config, body);
}

export async function resolveAuthorIdentity(
  account: XAccountConfig,
  accessToken: string,
): Promise<{ authorType: SocialAuthorType; authorUrn: string; label: string }> {
  const url = new URL(X_USERS_ME_URL);
  url.searchParams.set("user.fields", "username,name");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `X users/me request failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const json = JSON.parse(text) as {
    data?: { id?: string; name?: string; username?: string };
  };
  const userId = json.data?.id;

  if (!userId) {
    throw new Error("X users/me did not return a user id.");
  }

  const username = json.data?.username;
  const label =
    json.data?.name ??
    (username ? `@${username}` : account.label);

  return {
    authorType: "member",
    authorUrn: `urn:x:user:${userId}`,
    label,
  };
}

export type PublishXPostInput = {
  accessToken: string;
  text: string;
};

export type PublishXPostResult = {
  platformPostId: string;
  postUrl: string;
};

export type XPostMetric = {
  bookmarkCount: number;
  impressionCount: number;
  likeCount: number;
  quoteCount: number;
  replyCount: number;
  retweetCount: number;
  tweetId: string;
};

export async function publishXPost(
  input: PublishXPostInput,
): Promise<PublishXPostResult> {
  const response = await fetch(X_TWEETS_URL, {
    body: JSON.stringify({ text: input.text }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`X publish failed (${response.status}): ${text.slice(0, 400)}`);
  }

  const json = JSON.parse(text) as { data?: { id?: string } };
  const platformPostId = json.data?.id;

  if (!platformPostId) {
    throw new Error("X publish succeeded but no tweet id was returned.");
  }

  return {
    platformPostId,
    postUrl: `https://x.com/i/web/status/${platformPostId}`,
  };
}

function metricNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function lookupXPostMetrics({
  accessToken,
  tweetIds,
}: {
  accessToken: string;
  tweetIds: string[];
}): Promise<XPostMetric[]> {
  if (tweetIds.length === 0) {
    return [];
  }

  const url = new URL(X_TWEETS_URL);
  url.searchParams.set("ids", tweetIds.join(","));
  url.searchParams.set("tweet.fields", "public_metrics");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `X metrics lookup failed (${response.status}): ${text.slice(0, 400)}`,
    );
  }

  const json = JSON.parse(text) as {
    data?: Array<{
      id?: string;
      public_metrics?: Record<string, unknown>;
    }>;
  };

  return (json.data ?? [])
    .filter((item) => item.id)
    .map((item) => {
      const metrics = item.public_metrics ?? {};

      return {
        bookmarkCount: metricNumber(metrics.bookmark_count),
        impressionCount: metricNumber(metrics.impression_count),
        likeCount: metricNumber(metrics.like_count),
        quoteCount: metricNumber(metrics.quote_count),
        replyCount: metricNumber(metrics.reply_count),
        retweetCount: metricNumber(metrics.retweet_count),
        tweetId: item.id!,
      };
    });
}
