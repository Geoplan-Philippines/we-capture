Next.js 16 breaks from your training data. Read `docs/nextjs.md` before writing code.

## Product overview

We-Capture is Geoplan's event photobooth. Marketing runs it on a landscape touch screen with a camera. A visitor picks 3 or 6 photos, poses through a 3-2-1 countdown for each shot, and the booth frames the shots with the event's logos and theme (3 → vertical strip, 6 → 2×3 grid). The framed PNG is uploaded to Cloudflare R2 and the booth shows a QR code. The visitor scans it on their phone, enters name and email on `/d/<id>`, and downloads the PNG. No printer.

The primary action is getting a visitor from "Start" to a downloaded photo, and capturing their name and email on the way (leads CSV).

- Event branding (logos, backgrounds, theme line, colors) lives only in `lib/event.ts` and `public/events/<slug>/`. Each event gets its own frame; swap that config rather than editing components.
- Frame geometry (`lib/frame/layout.ts`) is shared by the canvas compositor and the on-screen mini preview. Photo slots are exactly the camera's delivered size: never crop or downscale shots.
- R2 credentials are server-only (`lib/server/*`). The browser talks to `/api/*` route handlers.
- Leads go to a CSV at `LEADS_CSV_PATH` (no database).

## Stack

Next.js 16 (App Router, Turbopack, standalone output) · React 19 · TypeScript strict · Tailwind CSS v4 · Motion · lucide-react · qrcode.react · AWS SDK S3 client (R2)

## Rules

- Package manager is pnpm. Only `pnpm-lock.yaml` is committed. Never add npm, yarn, or bun lockfiles.
- Run `pnpm lint` and `pnpm build` before committing. `scripts/docker-smoke.sh` checks the Docker image end to end (CI runs it).
