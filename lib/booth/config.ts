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
  /** Give up on a preview upload (the QR waits on it) after this long. */
  uploadTimeoutMs: 60_000,
  /** One attempt at sending the full-size PNG; it can be 100+ MB. */
  fullUploadTimeoutMs: 300_000,
  /** Waits between full-PNG attempts. Its length is the number of retries. */
  fullUploadRetryDelaysMs: [2_000, 5_000, 15_000],
} as const;

export const PHOTO_COUNTS = [3, 6] as const;
export type PhotoCount = (typeof PHOTO_COUNTS)[number];
