import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// AES-256-GCM encryption for OAuth tokens stored in the Ops database.
//
// The key is derived from OPS_SOCIAL_TOKEN_SECRET (server-only). Ciphertext is
// stored as `v1:<iv-base64>:<authTag-base64>:<cipher-base64>`. Tokens are never
// stored in plaintext and never returned to the browser.

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  const secret = process.env.OPS_SOCIAL_TOKEN_SECRET?.trim();

  if (!secret || secret.length < 16) {
    throw new Error(
      "OPS_SOCIAL_TOKEN_SECRET is not configured (require at least 16 characters).",
    );
  }

  // Normalize any secret length to a 32-byte AES-256 key.
  return createHash("sha256").update(secret).digest();
}

export function socialTokenSecretConfigured() {
  const secret = process.env.OPS_SOCIAL_TOKEN_SECRET?.trim();
  return Boolean(secret && secret.length >= 16);
}

export function encryptSocialToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSocialToken(payload: string): string {
  const parts = payload.split(":");

  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported encrypted social token format.");
  }

  const key = getKey();
  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const encrypted = Buffer.from(parts[3], "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
