import "server-only";
import { requireEnv } from "./env";

export function profileImagesBucket(): string {
  return requireEnv("STORAGE_PROFILE_IMAGES_BUCKET");
}

/** Objects in the public-read `profile-images` bucket are served straight from storage. */
export function profileImageUrl(key: string): string {
  const base = requireEnv("STORAGE_PUBLIC_BASE_URL").replace(/\/+$/, "");
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/${profileImagesBucket()}/${path}`;
}
