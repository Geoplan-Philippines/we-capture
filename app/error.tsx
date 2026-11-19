"use client";

import { RefreshCw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="font-display text-[1.9rem] leading-[1.08] font-[800] text-white">Something went wrong</h1>
      <p className="mt-4 text-lg leading-relaxed text-mist">
        The server couldn&apos;t load this page. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-14 items-center gap-2 rounded-xl bg-accent px-6 text-lg font-bold text-night"
      >
        <RefreshCw className="size-5" aria-hidden />
        Try again
      </button>
    </main>
  );
}
