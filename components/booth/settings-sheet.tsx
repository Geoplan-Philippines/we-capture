"use client";

import { Maximize, RefreshCw, X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { effectiveSize, type CameraSnapshot } from "@/lib/booth/camera";
import {
  ASPECT_SIMULATIONS,
  ROTATIONS,
  type AspectSimulation,
  type BoothSettings,
  type Rotation,
} from "@/lib/booth/settings";
import { cn } from "@/lib/utils";

/**
 * Operator settings. Opened by long-pressing the logos on the steps screen
 * (or pressing S). Saved in this browser.
 */
export function SettingsSheet({
  settings,
  snapshot,
  onChange,
  onRestart,
  onClose,
}: {
  settings: BoothSettings;
  snapshot: CameraSnapshot;
  onChange: (settings: BoothSettings) => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const devices = snapshot.status === "ready" || snapshot.status === "error" ? snapshot.devices : [];
  const selected = settings.deviceId ?? (snapshot.status === "ready" ? snapshot.deviceId : null) ?? "";
  const set = <K extends keyof BoothSettings>(key: K, value: BoothSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-[min(46rem,92vw)] rounded-2xl border border-line bg-[#0b1838] p-8 text-base text-ice shadow-2xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="font-display text-2xl font-[750] text-white">
            Booth settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="grid size-12 place-items-center rounded-full border border-line active:bg-white/10"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <p className="mt-3 text-sm text-mist">
          <Readout snapshot={snapshot} rotation={settings.rotation} />
        </p>

        <div className="mt-6 grid gap-6">
          <Field label="Camera">
            <select
              value={selected}
              onChange={(e) => set("deviceId", e.target.value || null)}
              className="h-12 w-full rounded-lg border border-line bg-night px-3 text-ice"
            >
              {devices.length === 0 ? <option value="">Default camera</option> : null}
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Camera mount" hint="Rotate the image if the camera is mounted sideways or upside down.">
            <Segmented<Rotation>
              options={ROTATIONS}
              value={settings.rotation}
              format={(r) => (r === 0 ? "Upright" : `${r}°`)}
              onChange={(r) => set("rotation", r)}
            />
          </Field>

          <Field label="Saved photos">
            <label className="flex h-12 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={settings.mirrorOutput}
                onChange={(e) => set("mirrorOutput", e.target.checked)}
                className="size-5 accent-accent"
              />
              Mirror saved photos like the live preview
            </label>
          </Field>

          <Field label="Simulate camera shape" hint="Testing only. Asks the browser to crop the camera to this shape.">
            <Segmented<AspectSimulation>
              options={ASPECT_SIMULATIONS}
              value={settings.simulateAspect}
              format={(a) => (a === "off" ? "Off" : a)}
              onChange={(a) => set("simulateAspect", a)}
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-line px-4 active:bg-white/10"
          >
            <RefreshCw className="size-4" aria-hidden />
            Restart camera
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-line px-4 active:bg-white/10"
          >
            <Maximize className="size-4" aria-hidden />
            Full screen
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Readout({ snapshot, rotation }: { snapshot: CameraSnapshot; rotation: Rotation }) {
  if (snapshot.status !== "ready") return <>Camera: {snapshot.status}</>;
  const out = effectiveSize(snapshot.width, snapshot.height, rotation);
  return (
    <>
      {snapshot.label || "Camera"} delivers {snapshot.width} × {snapshot.height}. Each photo is saved at {out.width}{" "}
      × {out.height}.
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-semibold text-white">{label}</p>
      {children}
      {hint ? <p className="mt-2 text-sm text-mist">{hint}</p> : null}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  format,
  onChange,
}: {
  options: readonly T[];
  value: T;
  format: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={cn(
            "h-12 min-w-16 rounded-lg border px-4",
            option === value ? "border-accent bg-accent/15 text-white" : "border-line active:bg-white/10",
          )}
        >
          {format(option)}
        </button>
      ))}
    </div>
  );
}
