import "server-only";
import { randomBytes } from "node:crypto";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { storageConfig, type StorageConfig } from "./env";

let cached: { key: string; client: S3Client; bucket: string } | null = null;

function s3(): { client: S3Client; bucket: string } {
  const config = storageConfig();
  const key = cacheKey(config);
  if (!cached || cached.key !== key) {
    cached = {
      key,
      bucket: config.bucket,
      client: new S3Client({
        region: "auto",
        endpoint: config.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        // Only send checksums when an operation requires them; keeps uploads
        // compatible with R2 and other S3-compatible stores.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      }),
    };
  }
  return cached;
}

function cacheKey(c: StorageConfig) {
  return [c.endpoint, c.bucket, c.accessKeyId, c.secretAccessKey].join("\n");
}

/** 128 random bits, base64url: 22 characters. */
export function newPhotoId() {
  return randomBytes(16).toString("base64url");
}

export const photoKey = (id: string) => `photos/${id}.png`;
export const previewKey = (id: string) => `previews/${id}.jpg`;

const IMMUTABLE = "public, max-age=31536000, immutable";

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = s3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
      CacheControl: IMMUTABLE,
    }),
  );
}

export async function objectExists(key: string): Promise<boolean> {
  const { client, bucket } = s3();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

/**
 * `ready`: the full PNG is stored. `pending`: only the preview is, and the
 * booth is still sending the PNG. `missing`: no such photo.
 */
export async function photoState(id: string): Promise<"ready" | "pending" | "missing"> {
  if (await objectExists(photoKey(id))) return "ready";
  return (await objectExists(previewKey(id))) ? "pending" : "missing";
}

export type StoredObject = {
  body: ReadableStream;
  contentType: string;
  contentLength?: number;
  etag?: string;
};

export async function getObject(key: string): Promise<StoredObject | null> {
  const { client, bucket } = s3();
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) return null;
    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType ?? "application/octet-stream",
      contentLength: result.ContentLength,
      etag: result.ETag,
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function isNotFound(error: unknown) {
  if (error instanceof S3ServiceException) {
    return (
      error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    );
  }
  return false;
}

export { IMMUTABLE as immutableCacheControl };
