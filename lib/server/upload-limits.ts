import "server-only";

// A 2×3 grid from a 4K camera composes to roughly 8400×9200 px.
export const MAX_PHOTO_BYTES = 200 * 1024 * 1024;
export const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

export const isPng = (bytes: Uint8Array) => startsWith(bytes, PNG_SIGNATURE);
export const isJpeg = (bytes: Uint8Array) => startsWith(bytes, JPEG_SIGNATURE);

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, i) => bytes[i] === byte);
}

export function uploadError(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
