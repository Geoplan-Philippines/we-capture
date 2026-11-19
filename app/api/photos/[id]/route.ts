import type { NextRequest } from "next/server";
import { servePhoto } from "@/lib/server/serve-photo";

/** Full-resolution PNG. `?download=1` serves it as an attachment. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/photos/[id]">) {
  const { id } = await ctx.params;
  const download = request.nextUrl.searchParams.get("download") === "1";
  return servePhoto(id, "full", { download });
}
