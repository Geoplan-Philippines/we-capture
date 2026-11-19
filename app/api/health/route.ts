/** Liveness check for Docker and uptime monitors. */
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
