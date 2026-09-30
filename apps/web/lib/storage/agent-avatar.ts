import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  AGENT_AVATAR_MIME_TYPES,
  type AgentAvatarMimeType,
  type AvatarUpload,
} from "@marshaldesk/shared";
import { profileImagesBucket } from "./public-url";
import { storageClient } from "./s3";

const UPLOAD_URL_TTL_SECONDS = 120;

// Every upload gets a fresh key, so the object never changes under its URL.
const AVATAR_CACHE_CONTROL = "public, max-age=31536000, immutable";

const EXTENSION_BY_TYPE: Record<AgentAvatarMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const KEY_FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/;

export function isAgentAvatarMimeType(
  value: string | undefined,
): value is AgentAvatarMimeType {
  return AGENT_AVATAR_MIME_TYPES.some((type) => type === value);
}

function avatarKeyPrefix(workspaceId: string): string {
  return `workspaces/${workspaceId}/agent-avatar/`;
}

/** Whether `key` has exactly the shape `presignAgentAvatarUpload` generates for this workspace. */
export function isAgentAvatarKey(workspaceId: string, key: string): boolean {
  const prefix = avatarKeyPrefix(workspaceId);
  return (
    key.startsWith(prefix) && KEY_FILE_PATTERN.test(key.slice(prefix.length))
  );
}

export async function presignAgentAvatarUpload(
  workspaceId: string,
  contentType: AgentAvatarMimeType,
): Promise<AvatarUpload> {
  const key = `${avatarKeyPrefix(workspaceId)}${randomUUID()}.${EXTENSION_BY_TYPE[contentType]}`;
  const uploadUrl = await getSignedUrl(
    storageClient(),
    new PutObjectCommand({
      Bucket: profileImagesBucket(),
      Key: key,
      ContentType: contentType,
      CacheControl: AVATAR_CACHE_CONTROL,
    }),
    {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(["content-type", "cache-control"]),
    },
  );
  return {
    key,
    uploadUrl,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": AVATAR_CACHE_CONTROL,
    },
  };
}

export type StoredObject = { size: number; contentType: string | undefined };

/** Returns `null` when the object doesn't exist. */
export async function headProfileImage(
  key: string,
): Promise<StoredObject | null> {
  try {
    const head = await storageClient().send(
      new HeadObjectCommand({ Bucket: profileImagesBucket(), Key: key }),
    );
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
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

export async function deleteProfileImage(key: string): Promise<void> {
  await storageClient().send(
    new DeleteObjectCommand({ Bucket: profileImagesBucket(), Key: key }),
  );
}

/** For cleanup after the database is already consistent, where a failure only leaves an orphan. */
export async function deleteProfileImageQuietly(key: string): Promise<void> {
  try {
    await deleteProfileImage(key);
  } catch (error) {
    console.error(`Couldn't delete profile image ${key}`, error);
  }
}
