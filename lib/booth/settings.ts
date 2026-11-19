/**
 * Operator settings for the booth machine. They live in this browser's
 * localStorage, so each booth keeps its own camera setup. URL parameters
 * override them for testing: `?rotate=90&aspect=9:16&mirror=1`.
 */

export type Rotation = 0 | 90 | 180 | 270;
export type AspectSimulation = "off" | "16:9" | "4:3" | "3:4" | "9:16";

export type BoothSettings = {
  /** Preferred camera. `null` lets the browser pick. */
  deviceId: string | null;
  /** Clockwise rotation applied to the camera image, for cameras mounted sideways. */
  rotation: Rotation;
  /** Mirror the saved photos the way the live preview is mirrored. */
  mirrorOutput: boolean;
  /** Testing aid: ask the browser to crop the camera to this shape. */
  simulateAspect: AspectSimulation;
};

export const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];
export const ASPECT_SIMULATIONS: readonly AspectSimulation[] = ["off", "16:9", "4:3", "3:4", "9:16"];

export const defaultSettings: BoothSettings = {
  deviceId: null,
  rotation: 0,
  // Saved photos read the right way round, so text on shirts and signs is legible.
  mirrorOutput: false,
  simulateAspect: "off",
};

const STORAGE_KEY = "we-capture:booth-settings";

export function loadSettings(): BoothSettings {
  let stored: Partial<BoothSettings> = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    stored = {};
  }
  const params = new URLSearchParams(window.location.search);
  const rotateParam = Number(params.get("rotate"));
  const aspectParam = params.get("aspect");
  const mirrorParam = params.get("mirror");

  return {
    deviceId: typeof stored.deviceId === "string" ? stored.deviceId : null,
    rotation: asRotation(params.has("rotate") ? rotateParam : stored.rotation),
    mirrorOutput:
      mirrorParam !== null ? mirrorParam === "1" : stored.mirrorOutput ?? defaultSettings.mirrorOutput,
    simulateAspect: asAspect(aspectParam ?? stored.simulateAspect),
  };
}

export function saveSettings(settings: BoothSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or storage disabled: settings last for this visit only.
  }
}

function asRotation(value: unknown): Rotation {
  return ROTATIONS.includes(value as Rotation) ? (value as Rotation) : 0;
}

function asAspect(value: unknown): AspectSimulation {
  return ASPECT_SIMULATIONS.includes(value as AspectSimulation) ? (value as AspectSimulation) : "off";
}

export function aspectValue(aspect: AspectSimulation): number | null {
  if (aspect === "off") return null;
  const [w, h] = aspect.split(":").map(Number);
  return w / h;
}

export function isQuarterTurn(rotation: Rotation) {
  return rotation === 90 || rotation === 270;
}
