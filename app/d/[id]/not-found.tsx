import { ScanLine } from "lucide-react";
import { LogoPanel } from "@/components/logo-panel";

export default function PhotoNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-6 pb-12 text-center">
      <LogoPanel height="1.9rem" />
      <div className="my-auto flex flex-col items-center py-12">
        <ScanLine className="size-14 text-accent" strokeWidth={1.5} aria-hidden />
        <h1 className="font-display mt-6 text-[1.9rem] leading-[1.08] font-[800] text-white">
          We can&apos;t find this photo
        </h1>
        <p className="mt-4 max-w-[32ch] text-lg leading-relaxed text-mist">
          The link may be incomplete. Scan the QR code at the booth again, or ask the booth team to show it to you.
        </p>
      </div>
    </main>
  );
}
