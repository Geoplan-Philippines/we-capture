import type { NextRequest } from "next/server";
import { isPhotoId } from "@/lib/photo-id";
import { objectExists, photoKey } from "@/lib/server/storage";

/**
 * `{ ready }`: whether the full-size PNG has arrived from the booth. The
 * download page polls this when a visitor scans the QR before it lands.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/photos/[id]/status">) {
  const { id } = await ctx.params;
  const headers = { "Cache-Control": "no-store" };
  if (!isPhotoId(id)) return Response.json({ error: "Photo not found." }, { status: 404, headers });
  try {
    return Response.json({ ready: await objectExists(photoKey(id)) }, { headers });
  } catch (error) {
    console.error(`Could not check photo ${id}`, error);
    return Response.json({ error: "Could not reach photo storage." }, { status: 502, headers });
  }
}
