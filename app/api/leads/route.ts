import { validateLead } from "@/lib/lead";
import { isPhotoId } from "@/lib/photo-id";
import { appendLead } from "@/lib/server/leads";
import { photoState } from "@/lib/server/storage";

const MAX_BODY_BYTES = 4 * 1024;

/**
 * Records a visitor's name and email against their photo, then hands back the
 * download link. Body: `{ photoId, name, email }`.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "Request is too large." });

  let body: { photoId?: unknown; name?: unknown; email?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Send the form as JSON." });
  }
  if (!body || typeof body !== "object") return json(400, { error: "Send the form as JSON." });

  if (!isPhotoId(body.photoId)) return json(404, { error: "Photo not found." });
  const result = validateLead(body);
  if (!result.ok) return json(422, { error: "Check the highlighted fields.", fields: result.errors });

  try {
    // A pending photo still takes the lead; the download page waits for the PNG.
    if ((await photoState(body.photoId)) === "missing") {
      return json(404, { error: "Photo not found." });
    }
  } catch (error) {
    console.error("Could not check photo in storage", error);
    return json(502, { error: "Could not reach photo storage. Try again in a moment." });
  }

  try {
    await appendLead(body.photoId, result.lead);
  } catch (error) {
    console.error("Could not write lead row", error);
    return json(500, { error: "Could not save your details. Try again in a moment." });
  }

  return json(201, { downloadUrl: `/api/photos/${body.photoId}?download=1` });
}

function json(status: number, body: unknown) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
