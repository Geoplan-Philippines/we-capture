import { aspectValue, isQuarterTurn, type BoothSettings, type Rotation } from "./settings";

export type CameraRequest = Pick<BoothSettings, "deviceId" | "simulateAspect">;

export type CameraDevice = { deviceId: string; label: string };

export type CameraSnapshot =
  | { status: "idle" }
  | { status: "starting" }
  | {
      status: "ready";
      /** Pixel size the camera is actually delivering, before rotation. */
      width: number;
      height: number;
      deviceId: string | null;
      label: string;
      devices: CameraDevice[];
    }
  | {
      status: "error";
      reason: "denied" | "missing" | "busy" | "unsupported" | "failed";
      message: string;
      devices: CameraDevice[];
    };

type ResizeModeConstraints = MediaTrackConstraints & { resizeMode?: ConstrainDOMString };
type ResizeModeCapabilities = MediaTrackCapabilities & { resizeMode?: string[] };

/**
 * Owns the camera stream and the one <video> element that shows it. Exposed
 * as an external store (`subscribe` / `getSnapshot`) for useSyncExternalStore.
 */
export class CameraController {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private snapshot: CameraSnapshot = { status: "idle" };
  private listeners = new Set<() => void>();
  private run = 0;
  private devices: CameraDevice[] = [];

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private set(next: CameraSnapshot) {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  attach = (video: HTMLVideoElement | null) => {
    if (this.video === video) return;
    this.video?.removeEventListener("resize", this.onResize);
    this.video = video;
    if (video) {
      video.addEventListener("resize", this.onResize);
      if (this.stream) void this.bind(video, this.stream);
    }
  };

  async start(settings: CameraRequest) {
    const run = ++this.run;
    this.release();
    this.set({ status: "starting" });

    if (!navigator.mediaDevices?.getUserMedia) {
      this.set({
        status: "error",
        reason: "unsupported",
        message: "This browser can't use a camera here. Open the booth over HTTPS or on localhost.",
        devices: [],
      });
      return;
    }

    try {
      const stream = await openStream(settings);
      if (run !== this.run) {
        stopStream(stream);
        return;
      }
      this.stream = stream;
      const track = stream.getVideoTracks()[0];
      track.addEventListener("ended", () => {
        if (run !== this.run) return;
        this.set({
          status: "error",
          reason: "failed",
          message: "The camera disconnected. Check the cable, then restart the camera.",
          devices: this.devices,
        });
      });

      if (this.video) await this.bind(this.video, stream);
      this.devices = await listCameras();
      if (run !== this.run) return;
      this.publishReady(track);
    } catch (error) {
      if (run !== this.run) return;
      this.devices = await listCameras().catch(() => []);
      this.set({ ...describeError(error), status: "error", devices: this.devices });
    }
  }

  stop() {
    this.run++;
    this.release();
    this.set({ status: "idle" });
  }

  /**
   * Grabs the current frame at the camera's full resolution, rotated for the
   * mount and optionally mirrored.
   */
  capture(rotation: Rotation, mirror: boolean): HTMLCanvasElement {
    const video = this.video;
    if (!video || video.videoWidth === 0) throw new Error("The camera is not ready.");
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const turned = isQuarterTurn(rotation);
    const canvas = document.createElement("canvas");
    canvas.width = turned ? vh : vw;
    canvas.height = turned ? vw : vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    // Applied bottom-up: rotate the raw frame, mirror it, then center it.
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (mirror) ctx.scale(-1, 1);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
    return canvas;
  }

  private onResize = () => {
    const track = this.stream?.getVideoTracks()[0];
    if (track && this.snapshot.status === "ready") this.publishReady(track);
  };

  private publishReady(track: MediaStreamTrack) {
    const settings = track.getSettings();
    // The video element reports what is really arriving; track settings can lag.
    const width = this.video?.videoWidth || settings.width || 0;
    const height = this.video?.videoHeight || settings.height || 0;
    if (!width || !height) return;
    this.set({
      status: "ready",
      width,
      height,
      deviceId: settings.deviceId ?? null,
      label: track.label,
      devices: this.devices,
    });
  }

  private async bind(video: HTMLVideoElement, stream: MediaStream) {
    if (video.srcObject !== stream) video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
    }
    try {
      await video.play();
    } catch {
      // Autoplay of a muted stream is allowed; a rejection here means the
      // element was swapped mid-start and the next bind will play it.
    }
  }

  private release() {
    if (this.stream) stopStream(this.stream);
    this.stream = null;
    if (this.video) this.video.srcObject = null;
  }
}

/**
 * Opens the camera at the highest resolution it offers. A first, plain
 * request reveals the camera's capability ranges; the second asks for the
 * maximum. `resizeMode: "none"` keeps Chrome from cropping or scaling the
 * native image to fit the request.
 */
async function openStream(settings: CameraRequest): Promise<MediaStream> {
  const device: MediaTrackConstraints = settings.deviceId
    ? { deviceId: { exact: settings.deviceId } }
    : {};

  let probe: MediaStream;
  try {
    probe = await navigator.mediaDevices.getUserMedia({ video: device, audio: false });
  } catch (error) {
    // The saved camera may have been unplugged; fall back to any camera.
    if (settings.deviceId && isNamed(error, "OverconstrainedError", "NotFoundError")) {
      probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } else {
      throw error;
    }
  }

  const probeTrack = probe.getVideoTracks()[0];
  const caps: ResizeModeCapabilities = probeTrack.getCapabilities?.() ?? {};
  const deviceId = probeTrack.getSettings().deviceId;
  stopStream(probe);

  const maxWidth = caps.width?.max ?? 3840;
  const maxHeight = caps.height?.max ?? 2160;
  const constraints: ResizeModeConstraints = {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    width: { ideal: maxWidth },
    height: { ideal: maxHeight },
  };

  const simulated = aspectValue(settings.simulateAspect);
  if (simulated) {
    // Testing aid: let the browser crop the sensor to the requested shape.
    constraints.aspectRatio = { exact: simulated };
    constraints.resizeMode = "crop-and-scale";
  } else if (caps.resizeMode?.includes("none")) {
    constraints.resizeMode = "none";
  }

  return navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
}

async function listCameras(): Promise<CameraDevice[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter((d) => d.kind === "videoinput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
}

function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

function isNamed(error: unknown, ...names: string[]) {
  return error instanceof Error && names.includes(error.name);
}

function describeError(error: unknown): {
  reason: "denied" | "missing" | "busy" | "failed";
  message: string;
} {
  if (isNamed(error, "NotAllowedError", "SecurityError")) {
    return {
      reason: "denied",
      message: "Camera access is blocked. Allow the camera in the browser's site settings, then restart the camera.",
    };
  }
  if (isNamed(error, "NotFoundError", "OverconstrainedError")) {
    return { reason: "missing", message: "No camera found. Plug one in, then restart the camera." };
  }
  if (isNamed(error, "NotReadableError", "AbortError")) {
    return {
      reason: "busy",
      message: "Another app is using the camera. Close it, then restart the camera.",
    };
  }
  return {
    reason: "failed",
    message: error instanceof Error ? error.message : "The camera failed to start.",
  };
}

/** Frame size after the mount rotation is applied. */
export function effectiveSize(width: number, height: number, rotation: Rotation) {
  return isQuarterTurn(rotation) ? { width: height, height: width } : { width, height };
}
