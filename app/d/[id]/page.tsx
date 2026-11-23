import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/download/lead-form";
import { LogoPanel } from "@/components/logo-panel";
import { event } from "@/lib/event";
import { isPhotoId } from "@/lib/photo-id";
import { photoState } from "@/lib/server/storage";

export const metadata: Metadata = {
  title: "Your photo",
  robots: { index: false, follow: false },
};

export default async function DownloadPage(props: PageProps<"/d/[id]">) {
  const { id } = await props.params;
  if (!isPhotoId(id)) notFound();
  // The QR shows as soon as the preview is stored; the PNG may still be on its way.
  const state = await photoState(id);
  if (state === "missing") notFound();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-cover bg-top opacity-60 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]"
        style={{ backgroundImage: `url(${event.backgrounds.portrait})` }}
      />
      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6 pb-10">
        <LogoPanel height="1.9rem" className="self-center" />

        <h1 className="font-display mt-7 text-center text-[2rem] leading-[1.05] font-[800] text-balance text-white">
          Your {event.name} photo
        </h1>

        {/* eslint-disable-next-line @next/next/no-img-element -- served from R2 through our API; size unknown until load */}
        <img
          src={`/api/photos/${id}/preview`}
          alt={`Your framed photos from ${event.name}`}
          className="mx-auto mt-6 block h-auto max-h-[52svh] w-auto max-w-full rounded-[3px] bg-white/5 shadow-[0_16px_40px_rgb(0_0_0/0.45)]"
        />

        <LeadForm photoId={id} initiallyReady={state === "ready"} />
      </main>
    </div>
  );
}
