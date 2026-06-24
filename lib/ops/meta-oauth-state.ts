import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const META_OAUTH_STATE_COOKIE = "ops_meta_oauth_state";
export const META_OAUTH_ACCOUNT_COOKIE = "ops_meta_oauth_account";
export const META_OAUTH_STATE_MAX_AGE_SECONDS = 600;

function stateSecret() {
  const secret =
    process.env.OPS_SOCIAL_TOKEN_SECRET?.trim() ||
    process.env.OPS_BASIC_AUTH_PASSWORD_SHA256?.trim();

  if (!secret) {
    throw new Error("No secret available to sign Meta OAuth state.");
  }

  return secret;
}

export function createOAuthState() {
  const nonce = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", stateSecret())
    .update(nonce)
    .digest("hex");
  return `${nonce}.${signature}`;
}

function verifySignedState(value: string) {
  const [nonce, signature] = value.split(".");

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

export function verifyOAuthState(
  fromQuery: string | null,
  fromCookie: string | null,
) {
  if (!fromQuery || !verifySignedState(fromQuery)) {
    return false;
  }

  if (!fromCookie) {
    // Some browsers drop the short-lived cookie on the Facebook redirect back;
    // the HMAC-signed state query param alone is sufficient CSRF protection.
    return true;
  }

  const queryBytes = Buffer.from(fromQuery);
  const cookieBytes = Buffer.from(fromCookie);

  return (
    queryBytes.length === cookieBytes.length &&
    timingSafeEqual(queryBytes, cookieBytes)
  );
}
