"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CornerBrackets } from "@/components/corner-brackets";
import { isQuarterTurn, type Rotation } from "@/lib/booth/settings";

/**
 * The live camera, mirrored like a mirror and shown whole. The box takes the
 * camera's real aspect ratio (after rotation) and fits inside its parent, so
 * the preview shows exactly what the shot will contain, with no cropping.
 */
export function Viewfinder({
  attach,
  width,
  height,
  rotation,
  children,
}: {
  attach: (video: HTMLVideoElement | null) => void;
  /** Effective frame size, after rotation. */
  width: number;
  height: number;
  rotation: Rotation;
  children?: ReactNode;
}) {
  const ratio = width / height;
  const turned = isQuarterTurn(rotation);
  return (
    <div className="relative flex h-full w-full items-center justify-center" style={{ containerType: "size" }}>
      <motion.div
        layout
        className="relative"
        style={{
          aspectRatio: `${width} / ${height}`,
          width: `min(100cqw, calc(100cqh * ${ratio}))`,
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[3px] bg-black/50">
          <video
            ref={attach}
            autoPlay
            muted
            playsInline
            disablePictureInPicture
            className="absolute top-1/2 left-1/2 max-w-none object-contain"
            style={{
              // A quarter-turned video is laid out in its raw orientation, then rotated into the box.
              width: turned ? `${(height / width) * 100}%` : "100%",
              height: turned ? `${(width / height) * 100}%` : "100%",
              transform: `translate(-50%, -50%) scaleX(-1) rotate(${rotation}deg)`,
            }}
          />
        </div>
        <CornerBrackets size="clamp(1.5rem, 4vh, 3rem)" thickness="clamp(3px, 0.45vh, 6px)" offset="clamp(0.5rem, 1.2vh, 1rem)" />
        {children}
      </motion.div>
    </div>
  );
}
