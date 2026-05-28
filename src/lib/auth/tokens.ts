import { createHash, randomBytes } from "node:crypto";

/**
 * Magic-token helpers for client project access.
 * We store SHA-256 hashes in DB and embed the plaintext in the URL.
 */

export function generateAccessToken(): { token: string; hash: string } {
  // 32 bytes -> 43-char base64url
  const token = randomBytes(32).toString("base64url");
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Short opaque key for inbound email reply addresses (reply+<key>@domain). */
export function generateInboundKey(): string {
  return randomBytes(12).toString("base64url"); // 16 chars
}
