"use client";

import { PersonStanding, Smile, Timer, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import { LogoPanel } from "@/components/logo-panel";
import { PHOTO_COUNTS, type PhotoCount } from "@/lib/booth/config";
import { frameKindFor } from "@/lib/frame/layout";
import { cn } from "@/lib/utils";
import { MiniFrame } from "./mini-frame";

const STEPS: { icon: LucideIcon; text: string }[] = [
  { icon: PersonStanding, text: "Stand in the center of the frame and strike your pose." },
  { icon: Timer, text: "Look at the screen and wait for the countdown." },
  { icon: Smile, text: "Hold still and smile while the camera takes your photo." },
];

const LAYOUT_NAMES: Record<PhotoCount, string> = { 3: "Photo strip", 6: "2 × 3 grid" };

export function StepsPanel({
  count,
  onCountChange,
  onStart,
  ready,
  frame,
  onOpenSettings,
}: {
  count: PhotoCount;
  onCountChange: (count: PhotoCount) => void;
  onStart: () => void;
  ready: boolean;
  frame: { width: number; height: number };
  onOpenSettings: () => void;
}) {
  const press = useRef<number | null>(null);
  // Long-press the logos for operator settings, out of visitors' way.
  const holdStart = () => {
    press.current = window.setTimeout(onOpenSettings, 1200);
  };
  const holdEnd = () => {
    if (press.current !== null) window.clearTimeout(press.current);
    press.current = null;
  };

  return (
    <motion.section
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0, x: "-3vw" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-3vw", transition: { duration: 0.25 } }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="pointer-events-auto absolute top-[6vh] left-[4vw] flex w-[43vw] flex-col">
        <div
          className="self-start"
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerLeave={holdEnd}
          onPointerCancel={holdEnd}
        >
          <LogoPanel height="clamp(1.75rem, 4.6vh, 3.25rem)" />
        </div>

        <h1 className="font-display mt-[5vh] text-[clamp(2.4rem,6.6vh,5.25rem)] leading-[0.98] font-[800] tracking-[-0.015em] text-balance text-white">
          Take your photo home
        </h1>
        <p className="mt-[2vh] max-w-[38ch] text-[clamp(1.05rem,2.4vh,1.65rem)] leading-snug text-mist">
          Pose for the camera, then scan the QR code to save the photo on your phone.
        </p>

        <ol className="mt-[4.5vh] flex flex-col">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <li
              key={text}
              className="grid grid-cols-[auto_auto_1fr] items-center gap-x-[2.6vh] border-t border-line py-[2vh] last:border-b"
            >
              <span className="font-display tabular text-[clamp(1.6rem,4.6vh,3.5rem)] leading-none font-[800] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon className="size-[clamp(1.6rem,4.4vh,3.25rem)] text-ice" strokeWidth={1.6} aria-hidden />
              <p className="text-[clamp(1.05rem,2.5vh,1.75rem)] leading-snug text-ice">{text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div
        role="radiogroup"
        aria-label="How many photos?"
        className="pointer-events-auto absolute bottom-[6vh] left-[4vw] flex h-[15vh] min-h-24 w-[43vw] gap-[2.2vh]"
      >
        {PHOTO_COUNTS.map((n) => {
          const selected = n === count;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onCountChange(n)}
              className={cn(
                "flex h-full flex-1 items-center gap-[2.2vh] rounded-[1.6vh] border-2 px-[2.4vh] text-left transition-colors",
                selected ? "border-accent bg-white/10" : "border-line bg-white/[0.03] active:bg-white/10",
              )}
            >
              <div className="h-[11vh] w-[8vh] shrink-0">
                <MiniFrame kind={frameKindFor(n)} shotWidth={frame.width} shotHeight={frame.height} className="rounded-[2px]" />
              </div>
              <span className="flex flex-col whitespace-nowrap">
                <span className="font-display text-[clamp(1.15rem,2.9vh,2rem)] leading-tight font-[750] text-white">
                  {n} photos
                </span>
                <span className="mt-[0.4vh] text-[clamp(0.95rem,2vh,1.35rem)] text-mist">{LAYOUT_NAMES[n]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={onStart}
        disabled={!ready}
        whileTap={{ scale: 0.98 }}
        className="font-display pointer-events-auto absolute right-[4vw] bottom-[6vh] left-[51vw] h-[15vh] min-h-24 rounded-[1.6vh] bg-accent text-[clamp(1.6rem,4.6vh,3.5rem)] font-[800] text-night transition-opacity disabled:opacity-40"
      >
        Start
      </motion.button>
    </motion.section>
  );
}
