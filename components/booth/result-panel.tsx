"use client";

import { CloudOff, LoaderCircle, RefreshCw, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { CornerBrackets } from "@/components/corner-brackets";
import { boothTimings } from "@/lib/booth/config";
import type { FrameKind } from "@/lib/frame/layout";
import { MiniFrame } from "./mini-frame";

export type ResultState =
  | { status: "composing" }
  | { status: "uploading"; previewUrl: string; width: number; height: number }
  | { status: "ready"; previewUrl: string; width: number; height: number; id: string; url: string }
  | { status: "failed"; message: string; previewUrl?: string; width?: number; height?: number };

export function ResultPanel({
  state,
  thumbs,
  kind,
  frame,
  secondsLeft,
  onStartOver,
  onRetry,
}: {
  state: ResultState;
  thumbs: string[];
  kind: FrameKind;
  frame: { width: number; height: number };
  secondsLeft: number | null;
  onStartOver: () => void;
  onRetry: () => void;
}) {
  const preview = "previewUrl" in state && state.previewUrl ? state : null;
  const canRetry = state.status === "failed" && Boolean(state.previewUrl);

  return (
    <motion.section
      className="absolute inset-0 grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-[5vw] px-[5vw] py-[7vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      {/* The composed photo, whole. */}
      <div className="relative min-h-0">
        {preview ? (
          <div className="flex h-full w-full items-center justify-end" style={{ containerType: "size" }}>
            <motion.div
              className="relative"
              style={{
                aspectRatio: `${preview.width} / ${preview.height}`,
                width: `min(100cqw, calc(100cqh * ${(preview.width ?? 1) / (preview.height ?? 1)}))`,
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL of the composed frame */}
              <img
                src={preview.previewUrl}
                alt="Your framed photos"
                className="h-full w-full rounded-[0.4vh] shadow-[0_3vh_8vh_rgb(0_0_0/0.5)]"
                draggable={false}
              />
            </motion.div>
          </div>
        ) : thumbs.length > 0 ? (
          <div className="ml-auto h-full w-full opacity-80">
            <MiniFrame kind={kind} shotWidth={frame.width} shotHeight={frame.height} thumbs={thumbs} />
          </div>
        ) : null}
      </div>

      {/* QR and actions. */}
      <div className="flex min-h-0 flex-col justify-center">
        <AnimatePresence mode="wait">
          {state.status === "ready" ? (
            <motion.div
              key="ready"
              className="flex flex-col items-start"
              initial={{ opacity: 0, y: "2vh" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <h2 className="font-display text-[clamp(2rem,5.6vh,4.25rem)] leading-[1.02] font-[800] text-balance text-white">
                Scan to save your photo
              </h2>
              <div className="relative mt-[4.5vh]">
                <div className="rounded-[1.6vh] bg-white p-[2.2vh]">
                  <QRCodeSVG
                    value={state.url}
                    level="M"
                    marginSize={0}
                    title="QR code linking to your photo"
                    className="block size-[min(34vh,26vw)]"
                  />
                </div>
                <CornerBrackets size="3.2vh" thickness="0.5vh" offset="1.4vh" />
              </div>
              <p className="mt-[4vh] max-w-[30ch] text-[clamp(1.05rem,2.5vh,1.7rem)] leading-snug text-ice">
                Point your phone camera at the code, then open the link.
              </p>
            </motion.div>
          ) : state.status === "failed" ? (
            <motion.div
              key="failed"
              className="flex flex-col items-start"
              initial={{ opacity: 0, y: "2vh" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CloudOff className="size-[6vh] text-danger" strokeWidth={1.75} aria-hidden />
              <h2 className="font-display mt-[2.5vh] text-[clamp(2rem,5vh,3.75rem)] leading-[1.02] font-[800] text-white">
                {canRetry ? "Upload failed" : "Couldn't make your photo"}
              </h2>
              <p className="mt-[2vh] max-w-[34ch] text-[clamp(1.05rem,2.4vh,1.6rem)] leading-snug text-ice" role="alert">
                {state.message}
              </p>
              {canRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="font-display mt-[4vh] inline-flex h-[10vh] min-h-16 items-center gap-[1.4vh] rounded-[1.6vh] bg-accent px-[5vh] text-[clamp(1.25rem,3.2vh,2.4rem)] font-[800] text-night active:scale-[0.98]"
                >
                  <RefreshCw className="size-[3.4vh]" aria-hidden />
                  Try again
                </button>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="working"
              className="flex flex-col items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="font-display text-[clamp(2rem,5.6vh,4.25rem)] leading-[1.02] font-[800] text-white">
                {state.status === "composing" ? "Framing your photos" : "Saving your photo"}
              </h2>
              <div className="mt-[4.5vh] flex size-[min(38.4vh,30vw)] items-center justify-center rounded-[1.6vh] border-2 border-dashed border-line">
                <LoaderCircle className="size-[7vh] animate-spin text-mist" aria-hidden />
              </div>
              <p className="mt-[4vh] max-w-[30ch] text-[clamp(1.05rem,2.5vh,1.7rem)] leading-snug text-mist">
                The QR code appears here once your photo is saved.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {state.status === "ready" || state.status === "failed" ? (
          <div className="mt-[5vh] flex flex-col items-start gap-[1.6vh]">
            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex h-[8.5vh] min-h-14 items-center gap-[1.4vh] rounded-[1.6vh] border-2 border-ice/70 px-[4vh] text-[clamp(1.1rem,2.7vh,1.9rem)] font-semibold text-white active:bg-white/10"
            >
              <RotateCcw className="size-[3vh]" aria-hidden />
              Start over
            </button>
            {secondsLeft !== null ? <IdleBar secondsLeft={secondsLeft} /> : null}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

function IdleBar({ secondsLeft }: { secondsLeft: number }) {
  const total = boothTimings.idleResetSeconds;
  return (
    <div className="flex items-center gap-[1.6vh] text-[clamp(0.9rem,2vh,1.3rem)] text-mist">
      <div className="h-[0.6vh] w-[22vh] overflow-hidden rounded-full bg-white/15" aria-hidden>
        <div
          className="h-full rounded-full bg-mist transition-[width] duration-300 ease-linear"
          style={{ width: `${(secondsLeft / total) * 100}%` }}
        />
      </div>
      <span className="tabular">Starting over in {secondsLeft} s</span>
    </div>
  );
}
