import "server-only";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SourceMimeType } from "@marshaldesk/shared";
import { requireEnv } from "./env";
import { storageClient } from "./s3";

const UPLOAD_URL_TTL_SECONDS = 300;

function uploadsBucket(): string {
  return requireEnv("STORAGE_UPLOADS_BUCKET");
}

export type PresignedUpload = {
  uploadUrl: string;
  /** Headers the browser must send with the PUT; they're part of the signature. */
  headers: Record<string, string>;
};

export async function presignUpload(
  key: string,
  contentType: SourceMimeType,
  size: number,
): Promise<PresignedUpload> {
  const uploadUrl = await getSignedUrl(
    storageClient(),
    new PutObjectCommand({
      Bucket: uploadsBucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
  return { uploadUrl, headers: { "Content-Type": contentType } };
}

export type StoredUpload = {
  size: number;
  contentType: string | undefined;
  etag: string | undefined;
};

/** Returns `null` when the object doesn't exist. */
export async function headUpload(key: string): Promise<StoredUpload | null> {
  try {
    const head = await storageClient().send(
      new HeadObjectCommand({ Bucket: uploadsBucket(), Key: key }),
    );
    return {
      size: head.ContentLength ?? 0,
      contentType: head.ContentType,
      etag: head.ETag,
    };
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function deleteUpload(key: string): Promise<void> {
  await storageClient().send(
    new DeleteObjectCommand({ Bucket: uploadsBucket(), Key: key }),
  );
}

/** For cleanup after the database is already consistent, where a failure only leaves an orphan. */
export async function deleteUploadQuietly(key: string): Promise<void> {
  try {
    await deleteUpload(key);
  } catch (error) {
    console.error(`Couldn't delete upload ${key}`, error);
  }
}
