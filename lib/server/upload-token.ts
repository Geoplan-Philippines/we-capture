import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { storageConfig } from "./env";

/**
 * Lets the booth send the full PNG after the QR code is already showing,
 * without letting anyone who scans the QR write to that photo. The token is
 * an HMAC of the photo id keyed by the R2 secret, so it needs no storage.
 */
export function fullUploadToken(id: string): string {
  return createHmac("sha256", storageConfig().secretAccessKey)
    .update(`we-capture:full-upload:${id}`)
    .digest("base64url");
}

export function isFullUploadToken(id: string, token: string | null): boolean {
  if (!token) return false;
  const expected = Buffer.from(fullUploadToken(id));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
