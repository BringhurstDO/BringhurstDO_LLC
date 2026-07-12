import "server-only";

import {
  LINKEDIN_AUTHORIZATION_URL,
  LINKEDIN_IMAGES_URL,
  LINKEDIN_POSTS_URL,
  LINKEDIN_TOKEN_URL,
  LINKEDIN_USERINFO_URL,
  LINKEDIN_VIDEOS_URL,
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
  imageUrn?: string;
  mediaUrn?: string;
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

export async function uploadLinkedInImage(input: {
  accessToken: string;
  authorUrn: string;
  bytes: Uint8Array;
  config: LinkedInResolvedConfig;
  contentType: string;
}): Promise<string> {
  const initResponse = await fetch(`${LINKEDIN_IMAGES_URL}?action=initializeUpload`, {
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: input.authorUrn,
      },
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": input.config.apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    method: "POST",
  });

  const initText = await initResponse.text();

  if (!initResponse.ok) {
    throw new Error(
      `LinkedIn image initialize failed (${initResponse.status}): ${initText.slice(0, 400)}`,
    );
  }

  const initJson = JSON.parse(initText) as {
    value?: { image?: string; uploadUrl?: string };
  };
  const uploadUrl = initJson.value?.uploadUrl?.trim();
  const imageUrn = initJson.value?.image?.trim();

  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn image initialize did not return uploadUrl and image URN.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    body: Buffer.from(input.bytes),
    headers: {
      "Content-Type": input.contentType,
    },
    method: "PUT",
  });

  if (!uploadResponse.ok) {
    const uploadText = await uploadResponse.text();
    throw new Error(
      `LinkedIn image upload failed (${uploadResponse.status}): ${uploadText.slice(0, 400)}`,
    );
  }

  return imageUrn;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeLinkedInUrn(urn: string) {
  return encodeURIComponent(urn);
}

export async function uploadLinkedInVideo(input: {
  accessToken: string;
  authorUrn: string;
  bytes: Uint8Array;
  config: LinkedInResolvedConfig;
  contentType: string;
}): Promise<string> {
  const initResponse = await fetch(`${LINKEDIN_VIDEOS_URL}?action=initializeUpload`, {
    body: JSON.stringify({
      initializeUploadRequest: {
        fileSizeBytes: input.bytes.byteLength,
        owner: input.authorUrn,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": input.config.apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    method: "POST",
  });

  const initText = await initResponse.text();

  if (!initResponse.ok) {
    throw new Error(
      `LinkedIn video initialize failed (${initResponse.status}): ${initText.slice(0, 400)}`,
    );
  }

  const initJson = JSON.parse(initText) as {
    value?: {
      uploadInstructions?: Array<{
        firstByte?: number;
        lastByte?: number;
        uploadUrl?: string;
      }>;
      uploadToken?: string;
      video?: string;
    };
  };

  const videoUrn = initJson.value?.video?.trim();
  const instructions = initJson.value?.uploadInstructions ?? [];
  const uploadToken = initJson.value?.uploadToken ?? "";

  if (!videoUrn || instructions.length === 0) {
    throw new Error(
      "LinkedIn video initialize did not return video URN and upload instructions.",
    );
  }

  const uploadedPartIds: string[] = [];

  for (const instruction of instructions) {
    const uploadUrl = instruction.uploadUrl?.trim();
    const firstByte = instruction.firstByte ?? 0;
    const lastByte = instruction.lastByte ?? input.bytes.byteLength - 1;

    if (!uploadUrl) {
      throw new Error("LinkedIn video upload instruction was missing uploadUrl.");
    }

    const chunk = input.bytes.slice(firstByte, lastByte + 1);
    const uploadResponse = await fetch(uploadUrl, {
      body: Buffer.from(chunk),
      headers: {
        "Content-Type": input.contentType || "application/octet-stream",
      },
      method: "PUT",
    });

    if (!uploadResponse.ok) {
      const uploadText = await uploadResponse.text();
      throw new Error(
        `LinkedIn video upload failed (${uploadResponse.status}): ${uploadText.slice(0, 400)}`,
      );
    }

    const etag =
      uploadResponse.headers.get("etag")?.replaceAll('"', "").trim() ||
      uploadResponse.headers.get("ETag")?.replaceAll('"', "").trim();

    if (etag) {
      uploadedPartIds.push(etag);
    }
  }

  const finalizeResponse = await fetch(`${LINKEDIN_VIDEOS_URL}?action=finalizeUpload`, {
    body: JSON.stringify({
      finalizeUploadRequest: {
        uploadToken,
        uploadedPartIds,
        video: videoUrn,
      },
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": input.config.apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    method: "POST",
  });

  if (!finalizeResponse.ok) {
    const finalizeText = await finalizeResponse.text();
    throw new Error(
      `LinkedIn video finalize failed (${finalizeResponse.status}): ${finalizeText.slice(0, 400)}`,
    );
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const statusUrl = `${LINKEDIN_VIDEOS_URL}/${encodeLinkedInUrn(videoUrn)}`;
    const statusResponse = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "LinkedIn-Version": input.config.apiVersion,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      method: "GET",
    });
    const statusText = await statusResponse.text();

    if (!statusResponse.ok) {
      throw new Error(
        `LinkedIn video status failed (${statusResponse.status}): ${statusText.slice(0, 400)}`,
      );
    }

    const statusJson = JSON.parse(statusText) as {
      status?: string;
      processingStatus?: string;
    };
    const status = (
      statusJson.status ??
      statusJson.processingStatus ??
      ""
    ).toUpperCase();

    if (status === "AVAILABLE" || status === "READY") {
      return videoUrn;
    }

    if (status === "FAILED" || status === "PROCESSING_FAILED") {
      throw new Error("LinkedIn video processing failed after upload.");
    }

    await sleep(2000);
  }

  throw new Error("LinkedIn video processing timed out before publish.");
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

  if (input.mediaUrn || input.imageUrn) {
    body.content = {
      media: {
        id: input.mediaUrn ?? input.imageUrn,
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
