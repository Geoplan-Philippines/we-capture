import { event } from "@/lib/event";
import { bracketBars, frameGeometry, type FrameGeometry, type FrameKind, type Rect } from "./layout";

/** A captured frame at the camera's native resolution. */
export type Shot = {
  image: CanvasImageSource;
  width: number;
  height: number;
};

export type ComposedFrame = {
  canvas: HTMLCanvasElement;
  /** 1 unless the browser could not allocate a full-size canvas. */
  scale: number;
};

// Chrome caps canvases at 16384px per side and ~268 MP. Stay under both with
// headroom for memory; typical frames (3–20 MP) never get near this.
const MAX_SIDE = 16_384;
const MAX_AREA = 120_000_000;

/**
 * Draws the shots into the event frame at full resolution. Shots are never
 * resized: each slot is the shot's own size. Only if the browser refuses to
 * allocate a canvas that large does it retry at a smaller scale.
 */
export async function composeFrame(
  kind: FrameKind,
  shots: Shot[],
  fontFamily: string,
): Promise<ComposedFrame> {
  if (shots.length === 0) throw new Error("No shots to compose.");
  const { width: W, height: H } = shots[0];
  const geo = frameGeometry(kind, W, H, event.logos);

  const tall = geo.height >= geo.width;
  const [background, logos] = await Promise.all([
    loadImage(tall ? event.backgrounds.portrait : event.backgrounds.landscape),
    Promise.all(event.logos.map((logo) => loadImage(logo.src))),
    loadFont(fontFamily, geo.theme.size),
  ]);

  let scale = Math.min(
    1,
    MAX_SIDE / Math.max(geo.width, geo.height),
    Math.sqrt(MAX_AREA / (geo.width * geo.height)),
  );
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = draw(geo, scale, shots, background, logos, fontFamily);
    if (canvas) return { canvas, scale };
    scale *= 0.75;
  }
  throw new Error("This browser could not allocate a canvas large enough for the frame.");
}

function draw(
  geo: FrameGeometry,
  scale: number,
  shots: Shot[],
  background: HTMLImageElement,
  logos: HTMLImageElement[],
  fontFamily: string,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(geo.width * scale);
  canvas.height = Math.round(geo.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background, scaled to cover.
  ctx.fillStyle = event.colors.night;
  ctx.fillRect(0, 0, geo.width, geo.height);
  drawCover(ctx, background, { x: 0, y: 0, w: geo.width, h: geo.height });

  // Calm the background so the photos lead, and seat the logo panel.
  ctx.fillStyle = withAlpha(event.colors.night, 0.22);
  ctx.fillRect(0, 0, geo.width, geo.height);
  const fadeTop = geo.panel.y - geo.panel.h * 0.6;
  const fade = ctx.createLinearGradient(0, fadeTop, 0, geo.height);
  fade.addColorStop(0, withAlpha(event.colors.night, 0));
  fade.addColorStop(1, withAlpha(event.colors.night, 0.55));
  ctx.fillStyle = fade;
  ctx.fillRect(0, fadeTop, geo.width, geo.height - fadeTop);

  drawBrackets(ctx, geo);

  // Photos on mats, drawn 1:1.
  ctx.fillStyle = event.colors.mat;
  for (const mat of geo.mats) ctx.fillRect(mat.x, mat.y, mat.w, mat.h);
  shots.forEach((shot, i) => {
    const slot = geo.slots[i];
    if (!slot) return;
    drawContain(ctx, shot, slot);
  });

  // Logo panel.
  ctx.fillStyle = event.colors.panel;
  ctx.beginPath();
  ctx.roundRect(geo.panel.x, geo.panel.y, geo.panel.w, geo.panel.h, geo.panel.radius);
  ctx.fill();

  logos.forEach((img, i) => {
    const r = geo.logos[i];
    if (r) ctx.drawImage(img, r.x, r.y, r.w, r.h);
  });
  ctx.fillStyle = event.colors.panelRule;
  for (const d of geo.dividers) ctx.fillRect(d.x, d.y, d.w, d.h);

  drawTheme(ctx, geo, fontFamily);

  // A canvas the browser could not back reads as fully transparent.
  const probe = ctx.getImageData(canvas.width - 1, canvas.height - 1, 1, 1).data;
  if (probe[3] !== 255) return null;
  return canvas;
}

function drawBrackets(ctx: CanvasRenderingContext2D, geo: FrameGeometry) {
  ctx.fillStyle = event.colors.accent;
  for (const bar of bracketBars(geo.brackets)) ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
}

function drawTheme(ctx: CanvasRenderingContext2D, geo: FrameGeometry, fontFamily: string) {
  const { cx, cy, maxWidth } = geo.theme;
  let size = geo.theme.size;
  const setFont = () => {
    ctx.font = `650 ${size}px ${fontFamily}`;
    if ("fontStretch" in ctx) ctx.fontStretch = "semi-expanded";
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${(size * 0.01).toFixed(2)}px`;
  };
  setFont();
  const measured = ctx.measureText(event.theme).width;
  if (measured > maxWidth) {
    size = Math.floor(size * (maxWidth / measured));
    setFont();
  }
  ctx.fillStyle = event.colors.primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(event.theme, cx, cy);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, box: Rect) {
  const s = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
}

/** Fits the whole shot inside the slot. Same-size shots land exactly 1:1. */
function drawContain(ctx: CanvasRenderingContext2D, shot: Shot, box: Rect) {
  const s = Math.min(box.w / shot.width, box.h / shot.height);
  const w = shot.width * s;
  const h = shot.height * s;
  ctx.drawImage(shot.image, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
}

function withAlpha(hex: string, alpha: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${src}`));
      img.src = src;
    });
    imageCache.set(src, pending);
    pending.catch(() => imageCache.delete(src));
  }
  return pending;
}

async function loadFont(fontFamily: string, size: number) {
  try {
    await document.fonts.load(`650 ${Math.round(size)}px ${fontFamily}`);
  } catch {
    // Falls back to the next family in the stack.
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}.`))),
      type,
      quality,
    );
  });
}

/** Downscaled JPEG copy, for screens and slow phone connections. */
export async function previewBlob(source: HTMLCanvasElement, maxSide: number, quality = 0.85) {
  const s = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * s));
  canvas.height = Math.max(1, Math.round(source.height * s));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, "image/jpeg", quality);
}
