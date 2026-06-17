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
  const url = new URL(X_AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", account.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
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
