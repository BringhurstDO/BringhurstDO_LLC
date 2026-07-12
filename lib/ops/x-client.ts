import "server-only";

import {
  X_MEDIA_UPLOAD_URL,
  X_TWEETS_URL,
  type XAccountConfig,
  type XResolvedConfig,
  X_AUTHORIZATION_URL,
  X_TOKEN_URL,
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
  mediaIds?: string[];
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

export async function uploadXMedia(input: {
  accessToken: string;
  bytes: Uint8Array;
  contentType: string;
  kind?: "image" | "gif" | "video";
}): Promise<string> {
  const kind = input.kind ?? "image";
  const useChunked =
    kind === "video" || kind === "gif" || input.bytes.byteLength > 5 * 1024 * 1024;

  if (!useChunked) {
    const form = new FormData();
    form.append(
      "media",
      new Blob([Buffer.from(input.bytes)], { type: input.contentType }),
      "ops-social-image",
    );

    const response = await fetch(X_MEDIA_UPLOAD_URL, {
      body: form,
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: "POST",
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`X media upload failed (${response.status}): ${text.slice(0, 400)}`);
    }

    const json = JSON.parse(text) as { media_id_string?: string };
    const mediaId = json.media_id_string?.trim();

    if (!mediaId) {
      throw new Error("X media upload did not return media_id_string.");
    }

    return mediaId;
  }

  return uploadXMediaChunked(input);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadXMediaChunked(input: {
  accessToken: string;
  bytes: Uint8Array;
  contentType: string;
  kind?: "image" | "gif" | "video";
}): Promise<string> {
  const kind = input.kind ?? "image";
  const mediaCategory =
    kind === "video" ? "tweet_video" : kind === "gif" ? "tweet_gif" : "tweet_image";

  const initUrl = new URL(X_MEDIA_UPLOAD_URL);
  initUrl.searchParams.set("command", "INIT");
  initUrl.searchParams.set("total_bytes", String(input.bytes.byteLength));
  initUrl.searchParams.set("media_type", input.contentType);
  initUrl.searchParams.set("media_category", mediaCategory);

  const initResponse = await fetch(initUrl, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: "POST",
  });
  const initText = await initResponse.text();

  if (!initResponse.ok) {
    throw new Error(
      `X media INIT failed (${initResponse.status}): ${initText.slice(0, 400)}`,
    );
  }

  const initJson = JSON.parse(initText) as { media_id_string?: string };
  const mediaId = initJson.media_id_string?.trim();

  if (!mediaId) {
    throw new Error("X media INIT did not return media_id_string.");
  }

  const chunkSize = 4 * 1024 * 1024;
  let segmentIndex = 0;

  for (let offset = 0; offset < input.bytes.byteLength; offset += chunkSize) {
    const chunk = input.bytes.slice(offset, offset + chunkSize);
    const form = new FormData();
    form.append("command", "APPEND");
    form.append("media_id", mediaId);
    form.append("segment_index", String(segmentIndex));
    form.append(
      "media",
      new Blob([Buffer.from(chunk)], { type: input.contentType }),
      `ops-chunk-${segmentIndex}`,
    );

    const appendResponse = await fetch(X_MEDIA_UPLOAD_URL, {
      body: form,
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: "POST",
    });

    if (!appendResponse.ok) {
      const appendText = await appendResponse.text();
      throw new Error(
        `X media APPEND failed (${appendResponse.status}): ${appendText.slice(0, 400)}`,
      );
    }

    segmentIndex += 1;
  }

  const finalizeUrl = new URL(X_MEDIA_UPLOAD_URL);
  finalizeUrl.searchParams.set("command", "FINALIZE");
  finalizeUrl.searchParams.set("media_id", mediaId);

  const finalizeResponse = await fetch(finalizeUrl, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: "POST",
  });
  const finalizeText = await finalizeResponse.text();

  if (!finalizeResponse.ok) {
    throw new Error(
      `X media FINALIZE failed (${finalizeResponse.status}): ${finalizeText.slice(0, 400)}`,
    );
  }

  const finalizeJson = JSON.parse(finalizeText) as {
    processing_info?: { check_after_secs?: number; state?: string };
  };

  let processing = finalizeJson.processing_info;

  for (let attempt = 0; attempt < 40 && processing; attempt += 1) {
    if (processing.state === "succeeded") {
      return mediaId;
    }

    if (processing.state === "failed") {
      throw new Error("X media processing failed after upload.");
    }

    const waitSecs = Math.max(1, processing.check_after_secs ?? 2);
    await sleep(waitSecs * 1000);

    const statusUrl = new URL(X_MEDIA_UPLOAD_URL);
    statusUrl.searchParams.set("command", "STATUS");
    statusUrl.searchParams.set("media_id", mediaId);

    const statusResponse = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: "GET",
    });
    const statusText = await statusResponse.text();

    if (!statusResponse.ok) {
      throw new Error(
        `X media STATUS failed (${statusResponse.status}): ${statusText.slice(0, 400)}`,
      );
    }

    const statusJson = JSON.parse(statusText) as {
      processing_info?: { check_after_secs?: number; state?: string };
    };
    processing = statusJson.processing_info;

    if (!processing) {
      return mediaId;
    }
  }

  return mediaId;
}

export async function publishXPost(
  input: PublishXPostInput,
): Promise<PublishXPostResult> {
  const payload: Record<string, unknown> = { text: input.text };

  if (input.mediaIds?.length) {
    payload.media = { media_ids: input.mediaIds };
  }

  const response = await fetch(X_TWEETS_URL, {
    body: JSON.stringify(payload),
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
