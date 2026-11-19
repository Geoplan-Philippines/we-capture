import "server-only";

export class ConfigError extends Error {}

export type StorageConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** R2 credentials. Read at request time so one image works in every environment. */
export function storageConfig(): StorageConfig {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  // Optional override for an S3-compatible server in local testing.
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  const missing = [
    !endpoint && "R2_ACCOUNT_ID",
    !accessKeyId && "R2_ACCESS_KEY_ID",
    !secretAccessKey && "R2_SECRET_ACCESS_KEY",
    !bucket && "R2_BUCKET",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new ConfigError(`Storage is not configured. Missing: ${missing.join(", ")}.`);
  }
  return { endpoint, bucket: bucket!, accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! };
}

/**
 * Origin the QR code points at. Must be reachable from visitors' phones, so set
 * PUBLIC_BASE_URL in production. Falls back to the request's own origin.
 */
export function publicBaseUrl(request: Request): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const url = new URL(request.url);
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function leadsCsvPath(): string {
  return process.env.LEADS_CSV_PATH?.trim() || "/data/leads.csv";
}
