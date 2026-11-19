import Image from "next/image";
import { Fragment } from "react";
import { event } from "@/lib/event";
import { logoHeightFactor } from "@/lib/frame/layout";
import { cn } from "@/lib/utils";

/**
 * The white logo plate. The logo files have white backgrounds, so they
 * always sit on this panel, never directly on the dark background.
 * `height` is the logo row height in any CSS length.
 */
export function LogoPanel({ height, className }: { height: string; className?: string }) {
  return (
    <div
      className={cn("inline-flex items-center bg-panel", className)}
      style={{
        height: `calc(${height} * 1.75)`,
        gap: `calc(${height} * 0.5)`,
        paddingInline: `calc(${height} * 0.6)`,
        borderRadius: `calc(${height} * 0.3)`,
      }}
    >
      {event.logos.map((logo, i) => (
        <Fragment key={logo.src}>
          {i > 0 ? (
            <span
              aria-hidden
              className="w-px shrink-0"
              style={{ height: `calc(${height} * 0.8)`, background: event.colors.panelRule }}
            />
          ) : null}
          <Image
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            unoptimized
            priority
            draggable={false}
            className="w-auto shrink-0 select-none"
            style={{ height: `calc(${height} * ${logoHeightFactor(logo).toFixed(3)})` }}
          />
        </Fragment>
      ))}
    </div>
  );
}
