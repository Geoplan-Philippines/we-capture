/** Booth pacing. Event branding lives in lib/event.ts. */
export const boothTimings = {
  /** Pause after Start, before the first countdown. */
  getReadyMs: 1400,
  /** Countdown before every shot: 3, 2, 1. */
  countdownSeconds: 3,
  /** How long each shot stays on screen before the next countdown. */
  reviewMs: 1600,
  /** Result screen returns to the steps screen after this long untouched. */
  idleResetSeconds: 60,
  /** Give up on an upload that hasn't finished after this long. */
  uploadTimeoutMs: 120_000,
} as const;

export const PHOTO_COUNTS = [3, 6] as const;
export type PhotoCount = (typeof PHOTO_COUNTS)[number];
