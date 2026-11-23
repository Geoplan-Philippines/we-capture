"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { event } from "@/lib/event";
import { EMAIL_MAX, NAME_MAX, validateLead, type LeadErrors } from "@/lib/lead";
import { downloadFileName } from "@/lib/photo-id";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  /** Lead saved; the booth is still sending the full-size PNG. */
  | { kind: "waiting" }
  | { kind: "done"; downloadUrl: string }
  | { kind: "error"; message: string };

// How long the phone waits for the booth's PNG before asking the visitor to retry.
const WAIT_FOR_PHOTO_MS = 4 * 60 * 1000;
const POLL_MS = 2000;

export function LeadForm({ photoId, initiallyReady }: { photoId: string; initiallyReady: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<LeadErrors>({});
  const link = useRef<HTMLAnchorElement>(null);
  const ready = useRef(initiallyReady);
  // Set once the lead is saved, so a retry only waits for the photo again.
  const savedUrl = useRef<string | null>(null);

  // Start the download as soon as the link is on screen; it stays for a second try.
  useEffect(() => {
    if (status.kind === "done") link.current?.click();
  }, [status]);

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = { name: data.get("name"), email: data.get("email") };
    const check = validateLead(input);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});

    if (savedUrl.current) return finish(savedUrl.current);
    setStatus({ kind: "sending" });

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, ...check.lead }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        downloadUrl?: string;
        error?: string;
        fields?: LeadErrors;
      };
      if (!response.ok || !body.downloadUrl) {
        if (body.fields) setErrors(body.fields);
        setStatus({ kind: "error", message: body.error ?? "Couldn't save your details. Try again." });
        return;
      }
      savedUrl.current = body.downloadUrl;
    } catch {
      setStatus({ kind: "error", message: "No connection. Check your internet and try again." });
      return;
    }
    await finish(savedUrl.current);
  };

  const finish = async (downloadUrl: string) => {
    if (!ready.current) {
      setStatus({ kind: "waiting" });
      ready.current = await waitForPhoto(photoId, Date.now() + WAIT_FOR_PHOTO_MS);
      if (!ready.current) {
        setStatus({
          kind: "error",
          message: "Your photo is still on its way from the booth. Keep this page open and try again in a moment.",
        });
        return;
      }
    }
    setStatus({ kind: "done", downloadUrl });
  };

  if (status.kind === "done") {
    return (
      <div className="mt-7 flex flex-col items-center text-center" aria-live="polite">
        <p className="font-display text-xl font-[750] text-white">Your download has started</p>
        <p className="mt-2 max-w-[34ch] text-base leading-relaxed text-mist">
          Check your downloads. On iPhone, you can also press and hold the photo above to save it to Photos.
        </p>
        <a
          ref={link}
          href={status.downloadUrl}
          download={downloadFileName(photoId)}
          className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ice/60 text-lg font-semibold text-white active:bg-white/10"
        >
          <Download className="size-5" aria-hidden />
          Download again
        </a>
      </div>
    );
  }

  const sending = status.kind === "sending" || status.kind === "waiting";
  return (
    <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-5">
      <p className="text-center text-base leading-relaxed text-mist">
        Enter your name and email to download the full-size photo.
      </p>
      <Field
        name="name"
        label="Name"
        autoComplete="name"
        maxLength={NAME_MAX}
        error={errors.name}
        disabled={sending}
      />
      <Field
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={EMAIL_MAX}
        error={errors.email}
        disabled={sending}
      />
      {status.kind === "error" ? (
        <p role="alert" className="text-base text-danger">
          {status.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={sending}
        className="font-display mt-1 inline-flex h-15 items-center justify-center gap-2.5 rounded-xl bg-accent text-lg font-[800] text-night transition-opacity active:scale-[0.99] disabled:opacity-70"
      >
        {sending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <Download className="size-5" aria-hidden />
        )}
        {status.kind === "waiting" ? "Finishing your photo" : sending ? "Saving" : "Download photo"}
      </button>
      {status.kind === "waiting" ? (
        <p className="-mt-2 text-center text-base leading-relaxed text-mist" aria-live="polite">
          The booth is still sending the full-size photo. Your download starts as soon as it arrives.
        </p>
      ) : null}
      <p className="text-center text-sm leading-relaxed text-mist/80">{event.privacyNote}</p>
    </form>
  );
}

/** Polls until the booth's PNG is stored, or the deadline passes. */
async function waitForPhoto(photoId: string, deadline: number): Promise<boolean> {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`/api/photos/${photoId}/status`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { ready?: boolean };
      if (response.ok && body.ready) return true;
    } catch {
      // Phone lost signal for a moment; keep trying until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return false;
}

function Field({
  name,
  label,
  error,
  ...input
}: {
  name: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `lead-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-semibold text-white">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "h-14 rounded-xl border-2 bg-white/[0.06] px-4 text-lg text-white outline-none placeholder:text-mist/60 focus:border-accent",
          error ? "border-danger" : "border-line",
        )}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
