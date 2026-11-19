/**
 * Photo ids are 16 random bytes in base64url: 22 characters, 128 bits.
 * Generated on the server (see lib/server/ids.ts); validated everywhere.
 */
const PHOTO_ID = /^[A-Za-z0-9_-]{22}$/;

export function isPhotoId(value: unknown): value is string {
  return typeof value === "string" && PHOTO_ID.test(value);
}

export function downloadFileName(id: string) {
  return `we-capture-${id}.png`;
}
