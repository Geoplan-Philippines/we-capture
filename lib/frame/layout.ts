/**
 * Frame geometry, shared by the canvas compositor and the on-screen mini
 * preview so what the visitor sees while shooting matches the final file.
 *
 * Every photo slot is exactly the size of the camera frame (same width, same
 * height), so shots are drawn 1:1 with no crop and no downscale. Margins,
 * brackets, and the logo panel scale with the slot size.
 */

export type FrameKind = "strip" | "grid";

export type Rect = { x: number; y: number; w: number; h: number };

export type FrameGeometry = {
  kind: FrameKind;
  width: number;
  height: number;
  /** Where each shot is drawn, row by row. Same size as the shot. */
  slots: Rect[];
  /** Mat behind each slot. */
  mats: Rect[];
  /** Viewfinder corners around the whole photo block. */
  brackets: { rect: Rect; length: number; thickness: number };
  /** White logo panel under the photos. */
  panel: Rect & { radius: number };
  logos: Rect[];
  /** Hairlines between neighbouring logos. */
  dividers: Rect[];
  /** Theme line: centered on `cx`, vertically centered on `cy`. */
  theme: { cx: number; cy: number; size: number; maxWidth: number };
};

type LogoSize = { width: number; height: number };

const GRID: Record<FrameKind, { cols: number; rows: number }> = {
  strip: { cols: 1, rows: 3 },
  grid: { cols: 2, rows: 3 },
};

export function frameKindFor(count: number): FrameKind {
  return count >= 6 ? "grid" : "strip";
}

export function shotCount(kind: FrameKind): number {
  const { cols, rows } = GRID[kind];
  return cols * rows;
}

export function frameGeometry(
  kind: FrameKind,
  shotWidth: number,
  shotHeight: number,
  logoSizes: readonly LogoSize[],
): FrameGeometry {
  const { cols, rows } = GRID[kind];
  const W = Math.max(1, Math.round(shotWidth));
  const H = Math.max(1, Math.round(shotHeight));

  // Photo spacing is relative to the slot width.
  const u = W / 100;
  const mat = Math.max(2, Math.round(1.1 * u));
  const gap = Math.round(3.6 * u);
  const pad = Math.round((kind === "strip" ? 7 : 6) * u);

  const matW = W + 2 * mat;
  const matH = H + 2 * mat;
  const blockW = cols * matW + (cols - 1) * gap;
  const blockH = rows * matH + (rows - 1) * gap;

  const mats: Rect[] = [];
  const slots: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (matW + gap);
      const y = pad + r * (matH + gap);
      mats.push({ x, y, w: matW, h: matH });
      slots.push({ x: x + mat, y: y + mat, w: W, h: H });
    }
  }

  const brackets = {
    rect: { x: pad, y: pad, w: blockW, h: blockH },
    length: Math.round(9 * u),
    thickness: Math.max(2, Math.round(0.9 * u)),
  };

  // Logo panel. Its scale follows the block width, damped for the wide grid
  // so the logos stay in proportion to the photos.
  const fu = (blockW / 100) * (kind === "strip" ? 1 : 0.72);
  const padY = Math.round(5 * fu);
  const padX = Math.round(6 * fu);
  const logoRowH = Math.round(9.5 * fu);
  const logoThemeGap = Math.round(3.4 * fu);
  const themeSize = Math.round(3.4 * fu);
  const themeLineH = Math.round(themeSize * 1.3);
  const panelH = padY + logoRowH + logoThemeGap + themeLineH + Math.round(padY * 0.9);
  const panelY = pad + blockH + Math.round(6 * u);
  const panel = {
    x: pad,
    y: panelY,
    w: blockW,
    h: panelH,
    radius: Math.round(2.4 * fu),
  };

  const { logos, dividers } = layoutLogos(logoSizes, {
    x: panel.x + padX,
    y: panel.y + padY,
    w: panel.w - 2 * padX,
    h: logoRowH,
  }, fu);

  const theme = {
    cx: panel.x + panel.w / 2,
    cy: panel.y + padY + logoRowH + logoThemeGap + themeLineH / 2,
    size: themeSize,
    maxWidth: panel.w - 2 * padX,
  };

  return {
    kind,
    width: blockW + 2 * pad,
    height: panel.y + panel.h + pad,
    slots,
    mats,
    brackets,
    panel,
    logos,
    dividers,
    theme,
  };
}

/**
 * The eight bars that draw the four viewfinder corners, set just outside the
 * photo block.
 */
export function bracketBars({ rect, length: L, thickness: t }: FrameGeometry["brackets"]): Rect[] {
  const off = t * 2.6;
  const left = rect.x - off;
  const top = rect.y - off;
  const right = rect.x + rect.w + off;
  const bottom = rect.y + rect.h + off;
  return [
    { x: left - t, y: top - t, w: L, h: t },
    { x: left - t, y: top - t, w: t, h: L },
    { x: right + t - L, y: top - t, w: L, h: t },
    { x: right, y: top - t, w: t, h: L },
    { x: left - t, y: bottom, w: L, h: t },
    { x: left - t, y: bottom + t - L, w: t, h: L },
    { x: right + t - L, y: bottom, w: L, h: t },
    { x: right, y: bottom + t - L, w: t, h: L },
  ];
}

/**
 * Logo height as a fraction of the logo row. Wide wordmarks and compact marks
 * get roughly equal visual weight by sizing each toward the same area
 * (1.7 × row height²), capped at the full row height.
 */
export function logoHeightFactor({ width, height }: LogoSize) {
  return Math.min(1, Math.sqrt(1.7 / (width / height)));
}

/** Lays logos out in a centered row with hairline dividers between them. */
function layoutLogos(
  sizes: readonly LogoSize[],
  row: Rect,
  fu: number,
): { logos: Rect[]; dividers: Rect[] } {
  if (sizes.length === 0) return { logos: [], dividers: [] };

  const dims = sizes.map((size) => {
    const h = logoHeightFactor(size);
    return { w: h * (size.width / size.height), h };
  });

  const gapUnits = 0.55; // space either side of a divider, in row heights
  const dividerW = Math.max(1, Math.round(0.14 * fu));
  const unitsWide =
    dims.reduce((sum, d) => sum + d.w, 0) + (dims.length - 1) * 2 * gapUnits;
  const scale = Math.min(row.h, (row.w - (dims.length - 1) * dividerW) / unitsWide);

  const totalW = unitsWide * scale + (dims.length - 1) * dividerW;
  let x = row.x + (row.w - totalW) / 2;
  const logos: Rect[] = [];
  const dividers: Rect[] = [];
  dims.forEach((d, i) => {
    const w = d.w * scale;
    const h = d.h * scale;
    logos.push({ x, y: row.y + (row.h - h) / 2, w, h });
    x += w;
    if (i < dims.length - 1) {
      x += gapUnits * scale;
      const dh = row.h * 0.8;
      dividers.push({ x, y: row.y + (row.h - dh) / 2, w: dividerW, h: dh });
      x += dividerW + gapUnits * scale;
    }
  });
  return { logos, dividers };
}
