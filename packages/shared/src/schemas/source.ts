export const SOURCE_STATUSES = [
  "uploaded",
  "processing",
  "ready",
  "failed",
] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const SOURCE_FILE_EXTENSIONS = [".pdf", ".md", ".txt"] as const;
