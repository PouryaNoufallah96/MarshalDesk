"use client";

import { createSourceUploadSchema, type Source } from "@marshaldesk/shared";
import { isDefinedError, safe } from "@orpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { receiveSource, removeSource } from "@/lib/knowledge/cache";
import { client } from "@/lib/orpc/client";
import { putFile } from "@/components/widget-settings/put-file";

const UPLOAD_FAILED = "Couldn't upload this file. Try again.";

/** A file on its way to storage. Once stored, the source row takes over. */
export type SourceUploadItem = {
  key: string;
  name: string;
  size: number;
  /** 0–100 while the file is being sent, `null` once it failed. */
  progress: number | null;
  error: string | null;
  /** The source this upload creates or replaces, once the server has it. */
  sourceId: string | null;
};

export type SourceUploads = {
  items: readonly SourceUploadItem[];
  upload: (files: readonly File[]) => void;
  dismiss: (key: string) => void;
};

/** `sources` lets a replacing upload show on its existing row right away. */
export function useSourceUploads(sources: readonly Source[]): SourceUploads {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<readonly SourceUploadItem[]>([]);

  function patch(key: string, changes: Partial<SourceUploadItem>) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, ...changes } : item,
      ),
    );
  }

  function drop(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  async function uploadOne(file: File) {
    const key = crypto.randomUUID();
    const existing = sources.find(
      (source) => source.kind === "file" && source.name === file.name,
    );
    setItems((current) => [
      {
        key,
        name: file.name,
        size: file.size,
        progress: 0,
        error: null,
        sourceId: existing?.id ?? null,
      },
      ...current,
    ]);

    const input = createSourceUploadSchema.safeParse({
      name: file.name,
      size: file.size,
    });
    if (!input.success) {
      patch(key, {
        progress: null,
        error: input.error.issues[0]?.message ?? UPLOAD_FAILED,
      });
      return;
    }

    const [presignError, target] = await safe(
      client.knowledge.createUpload(input.data),
    );
    if (presignError) {
      patch(key, {
        progress: null,
        error: isDefinedError(presignError)
          ? presignError.message
          : UPLOAD_FAILED,
      });
      return;
    }
    receiveSource(queryClient, target.source);
    patch(key, { sourceId: target.source.id });

    const stored = await putFile(
      target.uploadUrl,
      target.headers,
      file,
      (progress) => patch(key, { progress }),
    );
    if (stored) {
      drop(key);
      return;
    }

    if (target.replaced) {
      patch(key, { progress: null, error: UPLOAD_FAILED });
      return;
    }
    patch(key, { progress: null, error: UPLOAD_FAILED, sourceId: null });
    const [, abandoned] = await safe(
      client.knowledge.abandonUpload({
        id: target.source.id,
        updatedAt: target.source.updatedAt,
      }),
    );
    if (abandoned?.deleted) {
      removeSource(queryClient, target.source.id);
    }
  }

  return {
    items,
    upload: (files) => {
      for (const file of files) void uploadOne(file);
    },
    dismiss: drop,
  };
}
