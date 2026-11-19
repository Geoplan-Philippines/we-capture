"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MiniFrame } from "./mini-frame";
import type { CaptureView } from "./booth";

/** Drawn over the live viewfinder: get-ready cue, countdown, and each shot's review. */
export function CaptureOverlay({ view }: { view: CaptureView }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <AnimatePresence>
        {view.getReady ? (
          <motion.div
            key="ready"
            className="absolute inset-0 flex items-center justify-center bg-night/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.p
              className="font-display text-[clamp(2.5rem,9vh,7rem)] font-[800] text-white [text-shadow:0_0.5vh_3vh_rgb(6_14_42/0.6)]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              Get ready
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {view.countdown !== null ? (
          <motion.div
            key="countdown"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <Countdown value={view.countdown} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {view.review ? (
          <motion.img
            key={view.review}
            src={view.review}
            alt={`Photo ${view.shotIndex + 1}`}
            className="absolute inset-0 h-full w-full bg-night object-contain"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Countdown({ value }: { value: number }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative flex size-[min(46cqh,46cqw)] items-center justify-center" style={{ containerType: "size" }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" />
        <motion.circle
          key={value}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--event-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: circumference }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </svg>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          role="timer"
          aria-live="assertive"
          className="font-display tabular text-[62cqh] leading-none font-[800] text-white [text-shadow:0_0.3vh_0.6vh_rgb(6_14_42/0.55),0_0.8vh_5vh_rgb(6_14_42/0.6)]"
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** Around the viewfinder: cancel, progress, and the frame filling in. */
export function CaptureChrome({
  view,
  frame,
  onCancel,
}: {
  view: CaptureView;
  frame: { width: number; height: number };
  onCancel: () => void;
}) {
  const taken = view.thumbs.length;
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <div className="absolute top-[3.5vh] right-[4vw] left-[4vw] flex h-[6.5vh] items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="pointer-events-auto inline-flex h-full min-h-14 items-center gap-[1.2vh] rounded-full border-2 border-line px-[3vh] text-[clamp(1rem,2.3vh,1.5rem)] font-semibold text-ice active:bg-white/10"
        >
          <X className="size-[2.8vh]" aria-hidden />
          Cancel
        </button>
        <div className="flex items-center gap-[2.4vh]" aria-live="polite">
          <p className="font-display tabular text-[clamp(1.2rem,3.2vh,2.2rem)] font-[750] text-white">
            Photo {Math.min(view.shotIndex + 1, view.total)} of {view.total}
          </p>
          <div className="flex gap-[0.9vh]" aria-hidden>
            {Array.from({ length: view.total }, (_, i) => (
              <span
                key={i}
                className={
                  i < taken
                    ? "size-[1.6vh] rounded-full bg-accent"
                    : i === view.shotIndex
                      ? "size-[1.6vh] rounded-full border-2 border-accent"
                      : "size-[1.6vh] rounded-full border-2 border-line"
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-[13vh] right-[4vw] bottom-[5vh] w-[20vw]">
        <MiniFrame
          kind={view.kind}
          shotWidth={frame.width}
          shotHeight={frame.height}
          thumbs={view.thumbs}
          activeIndex={view.getReady ? undefined : view.shotIndex}
          className="rounded-[0.6vh] shadow-[0_2vh_5vh_rgb(0_0_0/0.45)]"
        />
      </div>
    </motion.div>
  );
}
