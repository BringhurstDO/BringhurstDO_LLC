import "server-only";

import {
  LINKEDIN_AUTHORIZATION_URL,
  LINKEDIN_POSTS_URL,
  LINKEDIN_TOKEN_URL,
  LINKEDIN_USERINFO_URL,
  type LinkedInAccountConfig,
  type LinkedInResolvedConfig,
} from "@/lib/ops/linkedin-config";
import type { SocialAuthorType } from "@/lib/ops/types";

// Server-only LinkedIn REST client for OAuth and the Posts API.
// All requests use the documented headers; tokens are passed in only and never
// logged. Callers must enforce the manual-approval gate before publishing.

export type LinkedInTokenResult = {
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

export function buildAuthorizationUrl(
  config: LinkedInResolvedConfig,
  account: LinkedInAccountConfig,
  state: string,
) {
  const url = new URL(LINKEDIN_AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", account.scopes.join(" "));
  return url.toString();
}

async function requestToken(body: URLSearchParams): Promise<LinkedInTokenResult> {
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `LinkedIn token request failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const json = JSON.parse(text) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: json.access_token,
    expiresAt: expiresAtFromSeconds(json.expires_in),
    refreshToken: json.refresh_token ?? null,
    refreshTokenExpiresAt: json.refresh_token_expires_in
      ? expiresAtFromSeconds(json.refresh_token_expires_in)
      : null,
    scope: json.scope ?? "",
  };
}

export async function exchangeCodeForToken(
  config: LinkedInResolvedConfig,
  code: string,
): Promise<LinkedInTokenResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  return requestToken(body);
}

export async function refreshAccessToken(
  config: LinkedInResolvedConfig,
  refreshToken: string,
): Promise<LinkedInTokenResult> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  return requestToken(body);
}

/**
 * Resolve the author URN for the connection. Organization mode uses the
 * configured org URN; member mode reads the authenticated member id.
 */
export async function resolveAuthorUrn(
  account: LinkedInAccountConfig,
  accessToken: string,
): Promise<{ authorUrn: string; authorType: SocialAuthorType; label: string }> {
  if (account.authorType === "organization" && account.organizationUrn) {
    return {
      authorType: "organization",
      authorUrn: account.organizationUrn,
      label: account.label,
    };
  }

  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `LinkedIn userinfo request failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const json = JSON.parse(text) as { sub?: string; name?: string };

  if (!json.sub) {
    throw new Error("LinkedIn userinfo did not return a member id.");
  }

  return {
    authorType: "member",
    authorUrn: `urn:li:person:${json.sub}`,
    label: json.name ?? account.label,
  };
}

/**
 * LinkedIn "little text" commentary requires escaping a set of reserved
 * characters with a backslash. Apply minimal escaping so bodies render intact.
 */
function escapeCommentary(text: string) {
  return text.replace(/[\\<>#~@*_{}[\]()|]/g, (match) => `\\${match}`);
}

function postUrlFromUrn(urn: string) {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`;
}

export type PublishLinkedInPostInput = {
  config: LinkedInResolvedConfig;
  accessToken: string;
  authorUrn: string;
  commentary: string;
  title?: string;
  linkUrl?: string;
};

export type PublishLinkedInPostResult = {
  platformPostId: string;
  postUrl: string;
};

async function sendLinkedInPost(
  config: LinkedInResolvedConfig,
  accessToken: string,
  body: Record<string, unknown>,
  failureLabel: string,
): Promise<PublishLinkedInPostResult> {
  const response = await fetch(LINKEDIN_POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": config.apiVersion,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${failureLabel} (${response.status}): ${text.slice(0, 400)}`);
  }

  const platformPostId =
    response.headers.get("x-restli-id") ||
    response.headers.get("x-linkedin-id") ||
    "";

  if (!platformPostId) {
    throw new Error(
      `${failureLabel}: succeeded but no post id was returned in the response headers.`,
    );
  }

  return {
    platformPostId,
    postUrl: postUrlFromUrn(platformPostId),
  };
}

export async function publishLinkedInPost(
  input: PublishLinkedInPostInput,
): Promise<PublishLinkedInPostResult> {
  const body: Record<string, unknown> = {
    author: input.authorUrn,
    commentary: escapeCommentary(input.commentary),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (input.linkUrl) {
    body.content = {
      article: {
        source: input.linkUrl,
        title: input.title?.slice(0, 400) || input.linkUrl,
      },
    };
  }

  return sendLinkedInPost(
    input.config,
    input.accessToken,
    body,
    "LinkedIn publish failed",
  );
}

export type ReshareLinkedInPostInput = {
  config: LinkedInResolvedConfig;
  accessToken: string;
  authorUrn: string;
  sourcePostUrn: string;
  commentary?: string;
};

export async function reshareLinkedInPost(
  input: ReshareLinkedInPostInput,
): Promise<PublishLinkedInPostResult> {
  const body: Record<string, unknown> = {
    author: input.authorUrn,
    commentary: input.commentary ? escapeCommentary(input.commentary) : "",
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
    reshareContext: {
      parent: input.sourcePostUrn,
    },
  };

  return sendLinkedInPost(
    input.config,
    input.accessToken,
    body,
    "LinkedIn reshare failed",
  );
}
