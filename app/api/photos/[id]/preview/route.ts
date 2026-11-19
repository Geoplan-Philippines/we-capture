import type { NextRequest } from "next/server";
import { servePhoto } from "@/lib/server/serve-photo";

/** Small JPEG for the download page, so phones on event Wi-Fi load it fast. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/photos/[id]/preview">) {
  const { id } = await ctx.params;
  return servePhoto(id, "preview");
}
