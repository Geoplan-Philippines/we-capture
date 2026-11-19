import { cn } from "@/lib/utils";

/**
 * Viewfinder corners in the event accent color. The same mark frames the live
 * camera, the composed photo, and the photo block printed on the frame.
 * Place inside a `relative` parent; the corners sit just outside its edges.
 */
export function CornerBrackets({
  size = "1.75rem",
  thickness = "3px",
  offset = "0.6rem",
  className,
}: {
  size?: string;
  thickness?: string;
  offset?: string;
  className?: string;
}) {
  const corner = "pointer-events-none absolute border-accent";
  const box = { width: size, height: size };
  const out = `calc(-1 * (${offset} + ${thickness}))`;
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={corner} style={{ ...box, top: out, left: out, borderTopWidth: thickness, borderLeftWidth: thickness }} />
      <span className={corner} style={{ ...box, top: out, right: out, borderTopWidth: thickness, borderRightWidth: thickness }} />
      <span className={corner} style={{ ...box, bottom: out, left: out, borderBottomWidth: thickness, borderLeftWidth: thickness }} />
      <span className={corner} style={{ ...box, bottom: out, right: out, borderBottomWidth: thickness, borderRightWidth: thickness }} />
    </div>
  );
}
