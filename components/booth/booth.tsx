"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CameraController, effectiveSize } from "@/lib/booth/camera";
import { boothTimings, type PhotoCount } from "@/lib/booth/config";
import { loadSettings, saveSettings, type BoothSettings } from "@/lib/booth/settings";
import { sleep, uploadFullPhoto, uploadPreview, type StartedPhoto } from "@/lib/booth/upload";
import { event } from "@/lib/event";
import { archivo } from "@/lib/fonts";
import { canvasToBlob, composeFrame, previewBlob } from "@/lib/frame/compose";
import { frameKindFor, shotCount, type FrameKind } from "@/lib/frame/layout";
import { CameraStatus } from "./camera-status";
import { CaptureChrome, CaptureOverlay } from "./capture-overlay";
import { ResultPanel, type FullUpload, type ResultState } from "./result-panel";
import { SettingsSheet } from "./settings-sheet";
import { StepsPanel } from "./steps-panel";
import { Viewfinder } from "./viewfinder";

type Phase = "steps" | "capture" | "result";

export type CaptureView = {
  kind: FrameKind;
  total: number;
  shotIndex: number;
  /** 3, 2, 1 while counting down; null otherwise. */
  countdown: number | null;
  getReady: boolean;
  /** Increments on every shot to replay the flash. */
  flash: number;
  /** Object URL of the shot being reviewed. */
  review: string | null;
  thumbs: string[];
};

type Session = {
  abort: AbortController;
  urls: string[];
  /** The PNG encodes while the preview uploads and the QR is on screen. */
  upload: { preview: Blob; png: Promise<Blob> } | null;
  /** Set once the preview is stored and the QR link works. */
  photo: StartedPhoto | null;
};

const SPRING = { type: "spring", stiffness: 140, damping: 24, mass: 0.9 } as const;

export default function Booth() {
  const [camera] = useState(() => new CameraController());
  const snapshot = useSyncExternalStore(camera.subscribe, camera.getSnapshot, camera.getSnapshot);
  const [settings, setSettings] = useState<BoothSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(
    () => new URLSearchParams(window.location.search).get("settings") === "1",
  );

  const [phase, setPhase] = useState<Phase>("steps");
  const [count, setCount] = useState<PhotoCount>(3);
  const [capture, setCapture] = useState<CaptureView | null>(null);
  const [result, setResult] = useState<ResultState>({ status: "composing" });
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const session = useRef<Session | null>(null);

  // Restart the camera only when the device or its requested shape changes.
  const { deviceId, simulateAspect } = settings;
  useEffect(() => {
    void camera.start({ deviceId, simulateAspect });
    return () => camera.stop();
  }, [camera, deviceId, simulateAspect]);

  const updateSettings = (next: BoothSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const ready = snapshot.status === "ready";
  const frame = ready
    ? effectiveSize(snapshot.width, snapshot.height, settings.rotation)
    : { width: 16, height: 9 };

  const endSession = useCallback(() => {
    const current = session.current;
    session.current = null;
    if (current) {
      current.abort.abort();
      for (const url of current.urls) URL.revokeObjectURL(url);
    }
  }, []);

  const startOver = useCallback(() => {
    endSession();
    setResetAt(null);
    setCapture(null);
    setResult({ status: "composing" });
    setPhase("steps");
  }, [endSession]);

  useEffect(() => endSession, [endSession]);

  /** Sends the full PNG in the background; its progress shows under the QR. */
  const sendFullPhoto = (current: Session) => {
    const { photo, upload } = current;
    if (!photo || !upload) return;
    const show = (full: FullUpload) => {
      if (session.current !== current) return;
      setResult((r) => (r.status === "ready" && r.id === photo.id ? { ...r, full } : r));
    };
    show("sending");
    uploadFullPhoto(photo, upload.png).then(
      () => show("saved"),
      (error) => {
        console.error(`Full photo ${photo.id} was not saved`, error);
        show("failed");
      },
    );
  };

  const runUpload = async (current: Session, previewUrl: string, width: number, height: number) => {
    if (!current.upload) return;
    setResetAt(null);
    setResult({ status: "uploading", previewUrl, width, height });
    try {
      const { id, url } = (current.photo ??= await uploadPreview(current.upload.preview, current.abort.signal));
      if (session.current !== current) return;
      setResult({ status: "ready", previewUrl, width, height, id, url, full: "sending" });
      sendFullPhoto(current);
    } catch (error) {
      if (session.current !== current) return;
      setResult({
        status: "failed",
        previewUrl,
        width,
        height,
        message: error instanceof Error ? error.message : "The upload failed.",
      });
    }
    setResetAt(Date.now() + boothTimings.idleResetSeconds * 1000);
  };

  const start = async () => {
    if (snapshot.status !== "ready" || session.current) return;
    const kind = frameKindFor(count);
    const total = shotCount(kind);
    const { rotation, mirrorOutput } = settings;
    const current: Session = { abort: new AbortController(), urls: [], upload: null, photo: null };
    const { signal } = current.abort;
    session.current = current;

    setCapture({ kind, total, shotIndex: 0, countdown: null, getReady: true, flash: 0, review: null, thumbs: [] });
    setPhase("capture");

    try {
      await sleep(boothTimings.getReadyMs, signal);
      const shots: HTMLCanvasElement[] = [];
      for (let i = 0; i < total; i++) {
        for (let n = boothTimings.countdownSeconds; n > 0; n--) {
          setCapture((c) => c && { ...c, getReady: false, shotIndex: i, countdown: n });
          await sleep(1000, signal);
        }
        // Flash and shutter happen together.
        const shot = camera.capture(rotation, mirrorOutput);
        shots.push(shot);
        setCapture((c) => c && { ...c, countdown: null, flash: i + 1 });

        const url = URL.createObjectURL(await previewBlob(shot, 1600, 0.86));
        current.urls.push(url);
        if (signal.aborted) return;
        setCapture((c) => c && { ...c, review: url, thumbs: [...c.thumbs, url] });
        await sleep(boothTimings.reviewMs, signal);
        setCapture((c) => c && { ...c, review: null });
      }

      setResult({ status: "composing" });
      setPhase("result");
      const composed = await composeFrame(
        kind,
        shots.map((image) => ({ image, width: image.width, height: image.height })),
        archivo.style.fontFamily,
      );
      shots.length = 0; // release the full-size frames
      // The QR only needs the preview. The full PNG (often 100+ MB at 4K) is
      // encoded and sent after the QR is already on screen.
      const preview = await previewBlob(composed.canvas, 2000, 0.86);
      if (signal.aborted) return;
      const png = canvasToBlob(composed.canvas, "image/png");
      png.catch(() => {}); // surfaced by uploadFullPhoto
      const previewUrl = URL.createObjectURL(preview);
      current.urls.push(previewUrl);
      current.upload = { png, preview };
      await runUpload(current, previewUrl, composed.canvas.width, composed.canvas.height);
    } catch (error) {
      if (signal.aborted) return;
      console.error(error);
      setPhase("result");
      setResult({
        status: "failed",
        message: error instanceof Error ? error.message : "Something went wrong while taking the photos.",
      });
      setResetAt(Date.now() + boothTimings.idleResetSeconds * 1000);
    }
  };

  const retryUpload = () => {
    const current = session.current;
    if (!current?.upload) return;
    if (result.status === "failed" && result.previewUrl) {
      void runUpload(current, result.previewUrl, result.width ?? 0, result.height ?? 0);
    } else if (result.status === "ready" && result.full === "failed") {
      sendFullPhoto(current);
    }
  };

  // Idle reset on the result screen: any touch pushes the deadline back.
  const onIdle = useEffectEvent(() => startOver());
  useEffect(() => {
    if (resetAt === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= resetAt) onIdle();
    };
    const interval = window.setInterval(tick, 250);
    const bump = () => setResetAt(Date.now() + boothTimings.idleResetSeconds * 1000);
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [resetAt]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === "Escape") {
      if (settingsOpen) setSettingsOpen(false);
      else if (phase !== "steps") startOver();
    } else if (e.key.toLowerCase() === "s" && phase === "steps") {
      setSettingsOpen(true);
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const secondsLeft = resetAt === null ? null : secondsUntil(resetAt, now);

  return (
    <main
      className="fixed inset-0 touch-none overflow-hidden bg-night bg-cover bg-center text-ice select-none"
      style={{ backgroundImage: `linear-gradient(rgb(6 14 42 / 0.55), rgb(6 14 42 / 0.55)), url(${event.backgrounds.landscape})` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <LayoutGroup>
        <motion.div
          layout
          transition={SPRING}
          className="absolute"
          style={{ ...viewfinderBox(phase), pointerEvents: phase === "result" ? "none" : "auto" }}
          animate={{ opacity: phase === "result" ? 0 : 1 }}
        >
          <Viewfinder attach={camera.attach} width={frame.width} height={frame.height} rotation={settings.rotation}>
            {phase === "steps" && !ready ? (
              <CameraStatus snapshot={snapshot} onRestart={() => void camera.start({ deviceId, simulateAspect })} />
            ) : null}
            {phase === "capture" && capture ? <CaptureOverlay view={capture} /> : null}
          </Viewfinder>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {phase === "steps" ? (
            <StepsPanel
              key="steps"
              count={count}
              onCountChange={setCount}
              onStart={() => void start()}
              ready={ready}
              frame={frame}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : null}
          {phase === "capture" && capture ? (
            <CaptureChrome key="capture" view={capture} frame={frame} onCancel={startOver} />
          ) : null}
          {phase === "result" ? (
            <ResultPanel
              key="result"
              state={result}
              thumbs={capture?.thumbs ?? []}
              kind={capture?.kind ?? "strip"}
              frame={frame}
              secondsLeft={secondsLeft}
              onStartOver={startOver}
              onRetry={retryUpload}
            />
          ) : null}
        </AnimatePresence>
      </LayoutGroup>

      {/* Shutter flash, full screen. */}
      <AnimatePresence>
        {capture && capture.flash > 0 && phase === "capture" ? (
          <motion.div
            key={capture.flash}
            className="pointer-events-none fixed inset-0 z-40 bg-white"
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen ? (
          <SettingsSheet
            key="settings"
            settings={settings}
            snapshot={snapshot}
            onChange={updateSettings}
            onRestart={() => void camera.start({ deviceId, simulateAspect })}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

/** Whole seconds until the idle reset. `now` is 0 until the first tick. */
function secondsUntil(resetAt: number, now: number) {
  const total = boothTimings.idleResetSeconds * 1000;
  const remaining = now === 0 ? total : resetAt - now;
  return Math.max(0, Math.ceil(Math.min(total, remaining) / 1000));
}

/** Where the live viewfinder sits in each phase. Motion animates between them. */
function viewfinderBox(phase: Phase) {
  switch (phase) {
    case "steps":
      return { top: "6vh", bottom: "25vh", left: "51vw", right: "4vw" };
    case "capture":
      return { top: "13vh", bottom: "5vh", left: "4vw", right: "27vw" };
    case "result":
      return { top: "13vh", bottom: "5vh", left: "4vw", right: "27vw" };
  }
}
