import * as z from "zod";

export const SOURCE_STATUSES = [
  "uploaded",
  "processing",
  "ready",
  "failed",
] as const;
export const sourceStatusSchema = z.enum(SOURCE_STATUSES);
export type SourceStatus = z.infer<typeof sourceStatusSchema>;

export const SOURCE_KINDS = ["file", "text"] as const;
export const sourceKindSchema = z.enum(SOURCE_KINDS);
export type SourceKind = z.infer<typeof sourceKindSchema>;

/** PRD L-3. */
export const SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const TEXT_SOURCE_MAX_LENGTH = 50_000;
export const SOURCE_TITLE_MAX_LENGTH = 120;
export const SOURCE_FILE_NAME_MAX_LENGTH = 200;

export const SOURCE_FILE_TYPES = {
  ".pdf": "application/pdf",
  ".md": "text/markdown",
  ".txt": "text/plain",
} as const;
export type SourceFileExtension = keyof typeof SOURCE_FILE_TYPES;
export type SourceMimeType = (typeof SOURCE_FILE_TYPES)[SourceFileExtension];
export const SOURCE_FILE_EXTENSIONS = Object.keys(
  SOURCE_FILE_TYPES,
) as SourceFileExtension[];

/** The supported extension of a file name, lowercased, or `null`. */
export function sourceFileExtension(name: string): SourceFileExtension | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = name.slice(dot).toLowerCase();
  return extension in SOURCE_FILE_TYPES
    ? (extension as SourceFileExtension)
    : null;
}

/**
 * Source files live at `workspaces/<workspaceId>/sources/<sourceId>.<ext>` in
 * the `uploads` bucket. Attachments will share the bucket under another
 * prefix, so the ingest trigger and every check match this exact shape.
 */
export function sourceStorageKey(
  workspaceId: string,
  sourceId: string,
  extension: SourceFileExtension,
): string {
  return `workspaces/${workspaceId}/sources/${sourceId}${extension}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const SOURCE_KEY_PATTERN = new RegExp(
  `^workspaces/(${UUID})/sources/(${UUID})(\\.pdf|\\.md|\\.txt)$`,
);

/** Parses a key made by `sourceStorageKey`; `null` for anything else. */
export function parseSourceStorageKey(key: string): {
  workspaceId: string;
  sourceId: string;
  extension: SourceFileExtension;
} | null {
  const match = SOURCE_KEY_PATTERN.exec(key);
  if (!match) return null;
  const [, workspaceId, sourceId, extension] = match;
  if (!workspaceId || !sourceId || !extension) return null;
  return {
    workspaceId,
    sourceId,
    extension: extension as SourceFileExtension,
  };
}

export const sourceSchema = z.object({
  id: z.string(),
  kind: sourceKindSchema,
  /** The file name, or the title of a text source. */
  name: z.string(),
  status: sourceStatusSchema,
  /**
   * A readable reason for the latest failed processing. On a `ready` source it
   * means a newer version failed and the previous one is still answering.
   */
  error: z.string().nullable(),
  /** Bytes for files, characters for text sources. */
  size: z.number().int(),
  chunkCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;

export const sourceDetailSchema = sourceSchema.extend({
  /** The text of a text source; `null` for files. */
  text: z.string().nullable(),
});
export type SourceDetail = z.infer<typeof sourceDetailSchema>;

export const chunkPreviewSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  content: z.string(),
  tokenCount: z.number().int(),
});
export type ChunkPreview = z.infer<typeof chunkPreviewSchema>;

export const sourceFileNameSchema = z
  .string()
  .trim()
  .min(1, { error: "The file needs a name." })
  .max(SOURCE_FILE_NAME_MAX_LENGTH, {
    error: `Use a file name under ${SOURCE_FILE_NAME_MAX_LENGTH} characters.`,
  })
  .refine((name) => sourceFileExtension(name) !== null, {
    error: "Use a PDF, Markdown or text file.",
  });

export const createSourceUploadSchema = z.object({
  name: sourceFileNameSchema,
  size: z
    .number()
    .int()
    .positive({ error: "This file is empty." })
    .max(SOURCE_MAX_BYTES, {
      error: `Use a file under ${SOURCE_MAX_BYTES / (1024 * 1024)} MB.`,
    }),
});
export type CreateSourceUploadInput = z.infer<typeof createSourceUploadSchema>;

export const sourceUploadSchema = z.object({
  source: sourceSchema,
  uploadUrl: z.string(),
  /** Headers the browser must send with the PUT; they're part of the signature. */
  headers: z.record(z.string(), z.string()),
  /** Whether this upload replaces an existing file with the same name. */
  replaced: z.boolean(),
});
export type SourceUpload = z.infer<typeof sourceUploadSchema>;

export const sourceTitleSchema = z
  .string()
  .trim()
  .min(1, { error: "Give the source a title." })
  .max(SOURCE_TITLE_MAX_LENGTH, {
    error: `Keep the title under ${SOURCE_TITLE_MAX_LENGTH} characters.`,
  });

export const sourceTextSchema = z
  .string()
  .trim()
  .min(1, { error: "Write some text for the agent to learn from." })
  .max(TEXT_SOURCE_MAX_LENGTH, {
    error: `Keep the text under ${TEXT_SOURCE_MAX_LENGTH.toLocaleString("en-US")} characters.`,
  });

export const textSourceSchema = z.object({
  title: sourceTitleSchema,
  text: sourceTextSchema,
});
export type TextSourceInput = z.input<typeof textSourceSchema>;
export type TextSource = z.output<typeof textSourceSchema>;

export const knowledgeBaseSchema = z.object({
  sources: z.array(sourceSchema),
  /** Generated from the knowledge base; empty while it has nothing ready. */
  suggestedQuestions: z.array(z.string()),
  /** Whether the agent has ingested knowledge to answer from (PRD AI-1). */
  hasKnowledge: z.boolean(),
});
export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>;
