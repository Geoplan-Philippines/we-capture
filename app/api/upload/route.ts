import { ConfigError, publicBaseUrl } from "@/lib/server/env";
import { newPhotoId, photoKey, previewKey, putObject } from "@/lib/server/storage";
import {
  MAX_PHOTO_BYTES,
  MAX_PREVIEW_BYTES,
  isJpeg,
  isPng,
  uploadError as error,
} from "@/lib/server/upload-limits";
import { fullUploadToken } from "@/lib/server/upload-token";

/**
 * Starts a photo. Multipart fields:
 * - `preview`: small JPEG for the download page.
 * - `photo`: the full-size PNG. Optional when a preview is sent.
 *
 * The booth sends only the preview so it can show the QR code right away,
 * then PUTs the PNG to /api/upload/<id> with the returned `uploadToken`.
 * Sending both at once still works and finishes the photo in one request.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "Send the photo as multipart form data.");
  }

  let photoBytes: Uint8Array | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return error(413, "The photo is too large.");
    photoBytes = new Uint8Array(await photo.arrayBuffer());
    if (!isPng(photoBytes)) return error(415, "The photo must be a PNG.");
  }

  let previewBytes: Uint8Array | null = null;
  const preview = form.get("preview");
  if (preview instanceof File && preview.size > 0 && preview.size <= MAX_PREVIEW_BYTES) {
    const bytes = new Uint8Array(await preview.arrayBuffer());
    if (isJpeg(bytes)) previewBytes = bytes;
  }

  if (!photoBytes && !previewBytes) return error(400, "Missing the photo file.");

  const id = newPhotoId();
  let uploadToken: string | undefined;
  try {
    if (!photoBytes) uploadToken = fullUploadToken(id);
    // Preview first: the PNG's presence is what marks a photo as complete.
    if (previewBytes) await putObject(previewKey(id), previewBytes, "image/jpeg");
    if (photoBytes) await putObject(photoKey(id), photoBytes, "image/png");
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      return error(500, "Photo storage is not configured on the server.");
    }
    console.error("Upload to storage failed", err);
    return error(502, "Could not save the photo to storage.");
  }

  return Response.json(
    { id, url: `${publicBaseUrl(request)}/d/${id}`, ...(uploadToken ? { uploadToken } : {}) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
