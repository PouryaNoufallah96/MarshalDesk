"use client";

import {
  AGENT_AVATAR_MAX_BYTES,
  AGENT_AVATAR_MIME_TYPES,
} from "@marshaldesk/shared";
import { useEffect, useState } from "react";

const acceptedTypes: readonly string[] = AGENT_AVATAR_MIME_TYPES;
const maxMegabytes = AGENT_AVATAR_MAX_BYTES / (1024 * 1024);

export const avatarRequirements = `PNG, JPEG, WebP or GIF, up to ${maxMegabytes} MB.`;

export type AvatarUpload = {
  url: string | null;
  error: string | null;
  select: (file: File) => void;
  fail: (message: string) => void;
  clear: () => void;
};

/** Keeps a picked avatar as a local object URL until uploads go to storage. */
export function useAvatarUpload(): AvatarUpload {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  function select(file: File) {
    if (!acceptedTypes.includes(file.type)) {
      setError("Use a PNG, JPEG, WebP or GIF image.");
      return;
    }
    if (file.size > AGENT_AVATAR_MAX_BYTES) {
      setError(`Use an image under ${maxMegabytes} MB.`);
      return;
    }
    setError(null);
    setUrl(URL.createObjectURL(file));
  }

  function clear() {
    setError(null);
    setUrl(null);
  }

  return { url, error, select, fail: setError, clear };
}
