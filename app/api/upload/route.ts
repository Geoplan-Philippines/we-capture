import { ConfigError, publicBaseUrl } from "@/lib/server/env";
import { newPhotoId, photoKey, previewKey, putObject } from "@/lib/server/storage";

// A 2×3 grid from a 4K camera composes to roughly 8000×7000 px.
const MAX_PHOTO_BYTES = 200 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Receives the composed frame from the booth and stores it in R2 as
 * photos/<id>.png, plus a small JPEG preview for the download page.
 * Responds with the id and the public link the QR code points to.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "Send the photo as multipart form data.");
  }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return error(400, "Missing the photo file.");
  if (photo.size > MAX_PHOTO_BYTES) return error(413, "The photo is too large.");
  const photoBytes = new Uint8Array(await photo.arrayBuffer());
  if (!startsWith(photoBytes, PNG_SIGNATURE)) return error(415, "The photo must be a PNG.");

  const preview = form.get("preview");
  let previewBytes: Uint8Array | null = null;
  if (preview instanceof File && preview.size > 0 && preview.size <= MAX_PREVIEW_BYTES) {
    const bytes = new Uint8Array(await preview.arrayBuffer());
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) previewBytes = bytes;
  }

  const id = newPhotoId();
  try {
    // Preview first: the PNG's presence is what marks a photo as complete.
    if (previewBytes) await putObject(previewKey(id), previewBytes, "image/jpeg");
    await putObject(photoKey(id), photoBytes, "image/png");
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      return error(500, "Photo storage is not configured on the server.");
    }
    console.error("Upload to storage failed", err);
    return error(502, "Could not save the photo to storage.");
  }

  return Response.json(
    { id, url: `${publicBaseUrl(request)}/d/${id}` },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, i) => bytes[i] === byte);
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
