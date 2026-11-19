"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { event } from "@/lib/event";
import { bracketBars, frameGeometry, type FrameKind, type Rect } from "@/lib/frame/layout";
import { cn } from "@/lib/utils";

/**
 * A live miniature of the final frame, drawn from the same geometry as the
 * canvas compositor. Slots fill in as shots are taken. Fits inside its parent,
 * which needs a definite width and height.
 */
export function MiniFrame({
  kind,
  shotWidth,
  shotHeight,
  thumbs = [],
  activeIndex,
  className,
}: {
  kind: FrameKind;
  shotWidth: number;
  shotHeight: number;
  thumbs?: string[];
  activeIndex?: number;
  className?: string;
}) {
  const geo = useMemo(
    () => frameGeometry(kind, shotWidth, shotHeight, event.logos),
    [kind, shotWidth, shotHeight],
  );
  const place = (r: Rect) => ({
    left: `${(r.x / geo.width) * 100}%`,
    top: `${(r.y / geo.height) * 100}%`,
    width: `${(r.w / geo.width) * 100}%`,
    height: `${(r.h / geo.height) * 100}%`,
  });
  const background = geo.height >= geo.width ? event.backgrounds.portrait : event.backgrounds.landscape;

  return (
    <div className="flex h-full w-full items-center justify-center" style={{ containerType: "size" }}>
    <div
      className={cn("relative overflow-hidden bg-night bg-cover bg-center", className)}
      style={{
        aspectRatio: `${geo.width} / ${geo.height}`,
        width: `min(100cqw, calc(100cqh * ${geo.width / geo.height}))`,
        backgroundImage: `url(${background})`,
        containerType: "inline-size",
      }}
    >
      <div className="absolute inset-0 bg-night/25" />
      {bracketBars(geo.brackets).map((bar, i) => (
        <div key={`b${i}`} className="absolute min-h-[1.5px] min-w-[1.5px] bg-accent" style={place(bar)} />
      ))}
      {geo.mats.map((mat, i) => (
        <div key={`m${i}`} className="absolute bg-white" style={place(mat)} />
      ))}
      {geo.slots.map((slot, i) => (
        <div key={`s${i}`} className="absolute overflow-hidden bg-[#1a2a52]" style={place(slot)}>
          <AnimatePresence>
            {thumbs[i] ? (
              <motion.img
                key={thumbs[i]}
                src={thumbs[i]}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
                initial={{ opacity: 0, scale: 1.15 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              />
            ) : null}
          </AnimatePresence>
          {activeIndex === i && !thumbs[i] ? (
            <motion.div
              className="absolute inset-0 border-[3px] border-accent bg-accent/15"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          ) : null}
        </div>
      ))}
      <div
        className="absolute bg-panel"
        style={{ ...place(geo.panel), borderRadius: `${(geo.panel.radius / geo.width) * 100}cqw` }}
      />
      {geo.logos.map((r, i) => {
        const logo = event.logos[i];
        return logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny static logo positioned by percentage
          <img key={logo.src} src={logo.src} alt="" className="absolute" style={place(r)} draggable={false} />
        ) : null;
      })}
      {geo.dividers.map((d, i) => (
        <div key={`d${i}`} className="absolute" style={{ ...place(d), background: event.colors.panelRule }} />
      ))}
    </div>
    </div>
  );
}
