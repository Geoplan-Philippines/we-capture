import { boothTimings } from "./config";

export type UploadResult = { id: string; url: string };

/** Sends the composed PNG (and its preview) to the server, which stores them in R2. */
export async function uploadPhoto(png: Blob, preview: Blob, signal: AbortSignal): Promise<UploadResult> {
  const form = new FormData();
  form.append("photo", png, "photo.png");
  form.append("preview", preview, "preview.jpg");

  let response: Response;
  try {
    response = await fetch("/api/upload", {
      method: "POST",
      body: form,
      signal: AbortSignal.any([signal, AbortSignal.timeout(boothTimings.uploadTimeoutMs)]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("The booth couldn't reach the server. Check its internet connection.");
  }

  const data = (await response.json().catch(() => ({}))) as Partial<UploadResult> & { error?: string };
  if (!response.ok || !data.id || !data.url) {
    throw new Error(data.error ?? `The server rejected the upload (${response.status}).`);
  }
  return { id: data.id, url: data.url };
}

/** Resolves after `ms`, or rejects as soon as the signal aborts. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
