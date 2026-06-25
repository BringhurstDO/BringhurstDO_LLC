import "server-only";

import type { MetaAccountConfig, MetaResolvedConfig } from "@/lib/ops/meta-config";

export const META_GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v22.0";

export const META_OAUTH_URL = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;
export const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export type MetaTokenResult = {
  accessToken: string;
  expiresAt: string;
  scope: string;
};

export type MetaResolvedAuthor = {
  accessToken: string;
  authorUrn: string;
  authorType: "organization";
  label: string;
};

function expiresAtFromSeconds(seconds: number | undefined) {
  const safeSeconds =
    typeof seconds === "number" && seconds > 0 ? seconds : 60 * 24 * 60 * 60;
  return new Date(Date.now() + safeSeconds * 1000).toISOString();
}

function parseGraphError(text: string, fallback: string) {
  try {
    const json = JSON.parse(text) as {
      error?: { message?: string; type?: string; code?: number };
    };
    const message = json.error?.message;
    const code = json.error?.code;
    if (message && code) {
      return `${message} (Meta error ${code})`;
    }
    if (message) {
      return message;
    }
  } catch {
    // fall through
  }

  return `${fallback}: ${text.slice(0, 300)}`;
}

async function readGraphJson<T>(response: Response, fallback: string) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(parseGraphError(text, fallback));
  }

  return JSON.parse(text) as T;
}

export function buildAuthorizationUrl(
  config: MetaResolvedConfig,
  account: MetaAccountConfig,
  state: string,
) {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  });

  if (config.loginConfigId) {
    params.set("config_id", config.loginConfigId);
    params.set("override_default_response_type", "true");
  } else {
    params.set("scope", account.scopes.join(","));
  }

  return `${META_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  config: MetaResolvedConfig,
  code: string,
): Promise<MetaTokenResult> {
  const url = new URL(`${META_GRAPH_URL}/oauth/access_token`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString(), { method: "GET" });
  const json = await readGraphJson<{
    access_token: string;
    expires_in?: number;
    token_type?: string;
  }>(response, "Meta token exchange failed");

  return {
    accessToken: json.access_token,
    expiresAt: expiresAtFromSeconds(json.expires_in),
    scope: "",
  };
}

export async function exchangeLongLivedUserToken(
  config: MetaResolvedConfig,
  shortLivedToken: string,
): Promise<MetaTokenResult> {
  const url = new URL(`${META_GRAPH_URL}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url.toString(), { method: "GET" });
  const json = await readGraphJson<{
    access_token: string;
    expires_in?: number;
  }>(response, "Meta long-lived token exchange failed");

  return {
    accessToken: json.access_token,
    expiresAt: expiresAtFromSeconds(json.expires_in),
    scope: "",
  };
}

type MetaPageAccount = {
  access_token?: string;
  id: string;
  name?: string;
};

async function listManagedPages(userAccessToken: string) {
  const url = new URL(`${META_GRAPH_URL}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userAccessToken);

  const response = await fetch(url.toString(), { method: "GET" });
  const json = await readGraphJson<{ data?: MetaPageAccount[] }>(
    response,
    "Meta page list failed",
  );

  return json.data ?? [];
}

function findConfiguredPage(pages: MetaPageAccount[], pageId: string) {
  return pages.find((page) => page.id === pageId) ?? null;
}

async function lookupInstagramOnPage(page: MetaPageAccount) {
  if (!page.access_token) {
    return null;
  }

  const igUrl = new URL(`${META_GRAPH_URL}/${page.id}`);
  igUrl.searchParams.set(
    "fields",
    "instagram_business_account{id,username}",
  );
  igUrl.searchParams.set("access_token", page.access_token);

  const response = await fetch(igUrl.toString(), { method: "GET" });
  const json = await readGraphJson<{
    instagram_business_account?: { id?: string; username?: string };
  }>(response, "Meta Instagram business account lookup failed");

  const igId = json.instagram_business_account?.id?.trim();
  if (!igId) {
    return null;
  }

  return {
    igId,
    page,
    username: json.instagram_business_account?.username?.trim() || null,
  };
}

async function resolveInstagramBusinessAuthor(
  account: MetaAccountConfig,
  pages: MetaPageAccount[],
) {
  const targetIgId = account.instagramBusinessAccountId ?? "";
  const preferredPages = account.pageId
    ? pages.filter((page) => page.id === account.pageId)
    : pages;

  for (const page of preferredPages) {
    const match = await lookupInstagramOnPage(page);
    if (match?.igId === targetIgId) {
      return {
        accessToken: match.page.access_token!,
        authorType: "organization" as const,
        authorUrn: match.igId,
        label: match.username || account.label,
      };
    }
  }

  if (account.pageId) {
    throw new Error(
      `Instagram business account ${targetIgId} was not found on Facebook Page ${account.pageId}. Confirm the Page is linked to that IG account in Meta Business settings.`,
    );
  }

  throw new Error(
    `Instagram business account ${targetIgId} was not found on any managed Facebook Page for this user. Add the hosting pageId to META_ACCOUNTS or confirm Page ↔ Instagram linkage.`,
  );
}

export async function resolveMetaAuthor(
  account: MetaAccountConfig,
  userAccessToken: string,
): Promise<MetaResolvedAuthor> {
  const pages = await listManagedPages(userAccessToken);

  if (account.kind === "facebook_page") {
    const page = findConfiguredPage(pages, account.pageId ?? "");

    if (!page?.access_token) {
      throw new Error(
        `Meta page ${account.pageId} was not returned for this user. Confirm you are a Page admin and the page is linked to this Facebook app.`,
      );
    }

    return {
      accessToken: page.access_token,
      authorType: "organization",
      authorUrn: page.id,
      label: page.name?.trim() || account.label,
    };
  }

  return resolveInstagramBusinessAuthor(account, pages);
}

export type PublishFacebookPagePostResult = {
  platformPostId: string;
  postUrl: string;
};

export async function publishFacebookPagePost(input: {
  message: string;
  pageAccessToken: string;
  pageId: string;
}): Promise<PublishFacebookPagePostResult> {
  const url = `${META_GRAPH_URL}/${input.pageId}/feed`;
  const response = await fetch(url, {
    body: JSON.stringify({
      access_token: input.pageAccessToken,
      message: input.message,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const json = await readGraphJson<{ id?: string }>(
    response,
    "Meta Facebook publish failed",
  );

  if (!json.id) {
    throw new Error("Meta Facebook publish did not return a post id.");
  }

  return {
    platformPostId: json.id,
    postUrl: `https://www.facebook.com/${json.id}`,
  };
}
