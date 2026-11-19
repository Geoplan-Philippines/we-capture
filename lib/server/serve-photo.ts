import "server-only";
import { downloadFileName, isPhotoId } from "@/lib/photo-id";
import { getObject, immutableCacheControl, photoKey, previewKey } from "./storage";

/** Streams a stored photo (or its preview) from R2 to the browser. */
export async function servePhoto(
  id: string,
  variant: "full" | "preview",
  options: { download?: boolean } = {},
): Promise<Response> {
  if (!isPhotoId(id)) return notFound();

  try {
    let object = variant === "preview" ? await getObject(previewKey(id)) : null;
    // Older uploads or a failed preview: fall back to the full PNG.
    object ??= await getObject(photoKey(id));
    if (!object) return notFound();

    const headers = new Headers({
      "Content-Type": object.contentType,
      "Cache-Control": immutableCacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    if (object.contentLength) headers.set("Content-Length", String(object.contentLength));
    if (object.etag) headers.set("ETag", object.etag);
    if (options.download) {
      headers.set("Content-Disposition", `attachment; filename="${downloadFileName(id)}"`);
      // Downloads go through the lead form; don't let intermediaries reuse them.
      headers.set("Cache-Control", "private, no-store");
    }
    return new Response(object.body, { headers });
  } catch (error) {
    console.error(`Could not read photo ${id}`, error);
    return Response.json(
      { error: "Could not load the photo right now." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function notFound() {
  return Response.json(
    { error: "Photo not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
