import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Signed OAuth state + PKCE verifier for X OAuth 2.0 (required by X).

export const X_OAUTH_STATE_COOKIE = "ops_x_oauth_state";
export const X_OAUTH_ACCOUNT_COOKIE = "ops_x_oauth_account";
export const X_OAUTH_PKCE_COOKIE = "ops_x_oauth_pkce";
export const X_OAUTH_STATE_MAX_AGE_SECONDS = 600;

function stateSecret() {
  const secret =
    process.env.OPS_SOCIAL_TOKEN_SECRET?.trim() ||
    process.env.OPS_BASIC_AUTH_PASSWORD_SHA256?.trim();

  if (!secret) {
    throw new Error("No secret available to sign X OAuth state.");
  }

  return secret;
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createOAuthState() {
  const nonce = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", stateSecret())
    .update(nonce)
    .digest("hex");
  return `${nonce}.${signature}`;
}

export function verifyOAuthState(
  fromQuery: string | null,
  fromCookie: string | null,
) {
  if (!fromQuery || !fromCookie) {
    return false;
  }

  const queryBytes = Buffer.from(fromQuery);
  const cookieBytes = Buffer.from(fromCookie);

  if (
    queryBytes.length !== cookieBytes.length ||
    !timingSafeEqual(queryBytes, cookieBytes)
  ) {
    return false;
  }

  const [nonce, signature] = fromQuery.split(".");

  if (!nonce || !signature) {
    return false;
  }

  const expected = createHmac("sha256", stateSecret())
    .update(nonce)
    .digest("hex");
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);

  return (
    expectedBytes.length === signatureBytes.length &&
    timingSafeEqual(expectedBytes, signatureBytes)
  );
}

export function createPkcePair() {
  const codeVerifier = base64UrlEncode(randomBytes(32));
  const codeChallenge = base64UrlEncode(
    createHash("sha256").update(codeVerifier).digest(),
  );

  return { codeChallenge, codeVerifier };
}
