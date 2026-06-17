const OPS_AUTH_SESSION_COOKIE = "ops_auth_session";
const OPS_AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return (
    process.env.OPS_SOCIAL_TOKEN_SECRET?.trim() ||
    process.env.OPS_BASIC_AUTH_PASSWORD_SHA256?.trim() ||
    ""
  );
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return bytesToHex(signature);
}

function timingSafeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

export function opsAuthSessionCookieName() {
  return OPS_AUTH_SESSION_COOKIE;
}

export function opsAuthSessionMaxAgeSeconds() {
  return OPS_AUTH_SESSION_MAX_AGE_SECONDS;
}

export async function createOpsAuthSessionValue() {
  const secret = sessionSecret();
  if (!secret) {
    return null;
  }

  const expiresAt = Date.now() + OPS_AUTH_SESSION_MAX_AGE_SECONDS * 1000;
  const nonce = crypto.randomUUID();
  const payload = `${expiresAt}.${nonce}`;
  const signature = await hmacSha256Hex(secret, payload);

  return `${payload}.${signature}`;
}

export async function verifyOpsAuthSessionValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [expiresAtRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresAtRaw);

  if (!nonce || !signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const secret = sessionSecret();
  if (!secret) {
    return false;
  }

  const payload = `${expiresAtRaw}.${nonce}`;
  const expected = await hmacSha256Hex(secret, payload);

  return timingSafeEqual(signature, expected);
}

export function opsAuthSessionCookieOptions(hostname: string, secure: boolean) {
  const base = {
    httpOnly: true,
    maxAge: OPS_AUTH_SESSION_MAX_AGE_SECONDS,
    path: "/ops",
    sameSite: "lax" as const,
    secure,
  };

  const normalized = hostname.toLowerCase();
  if (
    normalized === "bringhurstdo.com" ||
    normalized.endsWith(".bringhurstdo.com")
  ) {
    return { ...base, domain: ".bringhurstdo.com" };
  }

  return base;
}
