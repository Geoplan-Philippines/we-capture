import type { NextRequest } from "next/server";
import { isPhotoId } from "@/lib/photo-id";
import { ConfigError } from "@/lib/server/env";
import { objectExists, photoKey, putObject } from "@/lib/server/storage";
import { MAX_PHOTO_BYTES, isPng, uploadError as error } from "@/lib/server/upload-limits";
import { isFullUploadToken } from "@/lib/server/upload-token";

/**
 * Finishes a photo started with POST /api/upload: the raw PNG as the body,
 * `Authorization: Bearer <uploadToken>`. A photo's PNG is written once.
 */
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/upload/[id]">) {
  const { id } = await ctx.params;
  if (!isPhotoId(id)) return error(404, "Photo not found.");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES) return error(413, "The photo is too large.");

  try {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    if (!isFullUploadToken(id, token)) return error(403, "This upload link is not valid.");
    if (await objectExists(photoKey(id))) return error(409, "This photo is already saved.");

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength === 0) return error(400, "Missing the photo file.");
    if (bytes.byteLength > MAX_PHOTO_BYTES) return error(413, "The photo is too large.");
    if (!isPng(bytes)) return error(415, "The photo must be a PNG.");

    await putObject(photoKey(id), bytes, "image/png");
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      return error(500, "Photo storage is not configured on the server.");
    }
    console.error(`Upload of photo ${id} to storage failed`, err);
    return error(502, "Could not save the photo to storage.");
  }

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
