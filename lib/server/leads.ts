import "server-only";
import { randomUUID } from "node:crypto";
import { appendFile, link, mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Lead } from "@/lib/lead";
import { leadsCsvPath } from "./env";

// UTF-8 byte order mark so Excel reads names like "Peña" correctly.
const HEADER = "﻿timestamp,photo_id,name,email\n";

let queue: Promise<unknown> = Promise.resolve();

/**
 * Appends one row to the leads CSV.
 *
 * Safe under concurrent submissions:
 * - Rows in this process are written one at a time through a queue.
 * - Each row is a single O_APPEND write, which the OS places at the end of the
 *   file atomically, so writers in other processes can't interleave bytes.
 * - The header is created by hard-linking a finished temp file into place,
 *   which fails cleanly if the file already exists. No reader or writer ever
 *   sees a file without its header.
 */
export function appendLead(photoId: string, lead: Lead, at = new Date()): Promise<void> {
  const line = [at.toISOString(), photoId, lead.name, lead.email].map(csvField).join(",") + "\n";
  const next = queue.then(() => writeRow(leadsCsvPath(), line));
  queue = next.catch(() => undefined);
  return next;
}

async function writeRow(path: string, line: string) {
  await ensureFile(path);
  await appendFile(path, line, { encoding: "utf8", flag: "a" });
}

async function ensureFile(path: string) {
  if (await exists(path)) return;
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, HEADER, { encoding: "utf8", flag: "wx" });
  try {
    await link(temp, path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return;
    if (code !== "EPERM" && code !== "ENOTSUP" && code !== "ENOSYS") throw error;
    // Filesystem without hard links (some bind mounts): exclusive create
    // instead. The in-process queue still keeps this process's rows ordered.
    await writeFile(path, HEADER, { encoding: "utf8", flag: "wx" }).catch((e) => {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    });
  } finally {
    await unlink(temp).catch(() => undefined);
  }
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/**
 * RFC 4180 quoting, plus a leading apostrophe on values a spreadsheet would
 * otherwise run as a formula (=, +, -, @).
 */
export function csvField(value: string) {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}
