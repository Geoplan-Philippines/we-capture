import { boothTimings } from "./config";

/** A photo the server has started: the QR link works, the PNG may follow. */
export type StartedPhoto = { id: string; url: string; uploadToken: string };

/**
 * Sends the small preview JPEG. The server stores it and returns the link
 * for the QR code, so the visitor isn't kept waiting for the full PNG.
 */
export async function uploadPreview(preview: Blob, signal: AbortSignal): Promise<StartedPhoto> {
  const form = new FormData();
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

  const data = (await response.json().catch(() => ({}))) as Partial<StartedPhoto> & { error?: string };
  if (!response.ok || !data.id || !data.url || !data.uploadToken) {
    throw new Error(data.error ?? `The server rejected the upload (${response.status}).`);
  }
  return { id: data.id, url: data.url, uploadToken: data.uploadToken };
}

class PermanentUploadError extends Error {}

/**
 * Sends the full-size PNG for a started photo, retrying on network and
 * server errors. Deliberately not tied to the booth session: it keeps going
 * after the result screen resets, so the next visitor can start right away.
 */
export async function uploadFullPhoto(photo: StartedPhoto, png: Promise<Blob>): Promise<void> {
  const body = await png;
  const delays = boothTimings.fullUploadRetryDelaysMs;
  for (let attempt = 0; ; attempt++) {
    try {
      await putFullPhoto(photo, body);
      return;
    } catch (error) {
      if (error instanceof PermanentUploadError || attempt >= delays.length) throw error;
      console.warn(`Full photo upload for ${photo.id} failed; retrying`, error);
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

async function putFullPhoto(photo: StartedPhoto, png: Blob) {
  let response: Response;
  try {
    response = await fetch(`/api/upload/${photo.id}`, {
      method: "PUT",
      body: png,
      headers: { "Content-Type": "image/png", Authorization: `Bearer ${photo.uploadToken}` },
      signal: AbortSignal.timeout(boothTimings.fullUploadTimeoutMs),
    });
  } catch {
    throw new Error("The booth couldn't reach the server. Check its internet connection.");
  }
  // 409: an earlier attempt already landed.
  if (response.ok || response.status === 409) return;

  const data = (await response.json().catch(() => ({}))) as { error?: string };
  const message = data.error ?? `The server rejected the photo (${response.status}).`;
  if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
    throw new PermanentUploadError(message);
  }
  throw new Error(message);
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
