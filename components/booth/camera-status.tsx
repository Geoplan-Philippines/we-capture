"use client";

import { CameraOff, LoaderCircle, RefreshCw } from "lucide-react";
import type { CameraSnapshot } from "@/lib/booth/camera";

/** Shown inside the viewfinder until the camera is delivering frames. */
export function CameraStatus({
  snapshot,
  onRestart,
}: {
  snapshot: CameraSnapshot;
  onRestart: () => void;
}) {
  if (snapshot.status === "error") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.4vh] bg-night/85 p-[5%] text-center">
        <CameraOff className="size-[6vh] text-accent" strokeWidth={1.75} aria-hidden />
        <p className="max-w-[34ch] text-[clamp(1rem,2.3vh,1.5rem)] leading-snug text-ice">{snapshot.message}</p>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-[7.5vh] min-h-14 items-center gap-3 rounded-full bg-ice px-[4vh] text-[clamp(1rem,2.4vh,1.6rem)] font-semibold text-night active:scale-[0.98]"
        >
          <RefreshCw className="size-[2.8vh]" aria-hidden />
          Restart camera
        </button>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2vh] bg-night/60 text-mist">
      <LoaderCircle className="size-[5vh] animate-spin" aria-hidden />
      <p className="text-[clamp(1rem,2.2vh,1.4rem)]">Starting the camera</p>
    </div>
  );
}
