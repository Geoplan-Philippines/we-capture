import { LogoPanel } from "@/components/logo-panel";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-6 pb-12 text-center">
      <LogoPanel height="1.9rem" />
      <div className="my-auto py-12">
        <h1 className="font-display text-[1.9rem] leading-[1.08] font-[800] text-white">This page doesn&apos;t exist</h1>
        <p className="mt-4 text-lg leading-relaxed text-mist">
          To get your photo, scan the QR code shown at the booth.
        </p>
      </div>
    </main>
  );
}
