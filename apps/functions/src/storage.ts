import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  S3Client,
} from "@aws-sdk/client-s3";
import { requireEnv, uploadsBucket } from "./env";

let client: S3Client | undefined;

function s3(): S3Client {
  client ??= new S3Client({
    region: requireEnv("AWS_REGION"),
    endpoint: requireEnv("AWS_ENDPOINT_URL_S3"),
    credentials: {
      accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

export type ObjectHead = {
  size: number;
  contentType: string | null;
  etag: string | null;
};

function isMissing(error: unknown): boolean {
  return (
    error instanceof NotFound ||
    error instanceof NoSuchKey ||
    (error instanceof Error &&
      (error.name === "NotFound" || error.name === "NoSuchKey"))
  );
}

/** `null` when the object doesn't exist. */
export async function headUpload(key: string): Promise<ObjectHead | null> {
  try {
    const head = await s3().send(
      new HeadObjectCommand({ Bucket: uploadsBucket(), Key: key }),
    );
    return {
      size: head.ContentLength ?? 0,
      contentType: head.ContentType ?? null,
      etag: head.ETag ?? null,
    };
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

export async function deleteUpload(key: string): Promise<void> {
  await s3().send(
    new DeleteObjectCommand({ Bucket: uploadsBucket(), Key: key }),
  );
}

export type DownloadResult =
  | { kind: "ok"; bytes: Uint8Array; etag: string | null }
  | { kind: "missing" }
  | { kind: "too_large"; size: number };

export async function downloadUpload(
  key: string,
  maxBytes: number,
): Promise<DownloadResult> {
  let response;
  try {
    response = await s3().send(
      new GetObjectCommand({ Bucket: uploadsBucket(), Key: key }),
    );
  } catch (error) {
    if (isMissing(error)) return { kind: "missing" };
    throw error;
  }
  const body = response.Body;
  if (!body) return { kind: "missing" };
  const size = response.ContentLength ?? 0;
  if (size > maxBytes) {
    if ("destroy" in body && typeof body.destroy === "function") body.destroy();
    return { kind: "too_large", size };
  }
  const bytes = await body.transformToByteArray();
  if (bytes.byteLength > maxBytes) {
    return { kind: "too_large", size: bytes.byteLength };
  }
  return { kind: "ok", bytes, etag: response.ETag ?? null };
}
