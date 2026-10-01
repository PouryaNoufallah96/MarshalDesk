import type { SourceFileExtension } from "@marshaldesk/shared";
import { extractText } from "unpdf";

/** A failure the owner should see on the source, in plain words. */
export class IngestError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "IngestError";
  }
}

export const INGEST_REASONS = {
  unsupportedType:
    "This file type isn't supported. Use a PDF, Markdown or text file.",
  tooLarge: "This file is larger than 10 MB. Upload a smaller file.",
  damagedPdf: "This PDF looks damaged and couldn't be read.",
  damagedText: "This file looks damaged and couldn't be read.",
  passwordPdf:
    "This PDF is password-protected. Remove the password and upload it again.",
  noText: "No text could be found. Scanned PDFs aren't supported.",
  missingFile: "The file couldn't be found. Upload it again.",
  embedding:
    "We couldn't process this source right now. Upload or save it again in a minute.",
  generic:
    "Something went wrong while processing this source. Upload or save it again.",
} as const;

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v\u00a0\u2000-\u200b\u3000]+/g, " ")
    .replace(/ {2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function parsePdf(bytes: Uint8Array): Promise<string> {
  try {
    const { text } = await extractText(bytes, { mergePages: true });
    return text;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
      throw new IngestError(INGEST_REASONS.passwordPdf);
    }
    throw new IngestError(INGEST_REASONS.damagedPdf);
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8").decode(bytes);
  if (text.includes("\u0000")) {
    throw new IngestError(INGEST_REASONS.damagedText);
  }
  return text.replace(/^\uFEFF/, "");
}

/** The file's text, whitespace normalized. Throws `IngestError`. */
export async function parseFile(
  extension: SourceFileExtension,
  bytes: Uint8Array,
): Promise<string> {
  let raw: string;
  switch (extension) {
    case ".pdf":
      raw = await parsePdf(bytes);
      break;
    case ".md":
    case ".txt":
      raw = decodeUtf8(bytes);
      break;
    default: {
      const unreachable: never = extension;
      void unreachable;
      throw new IngestError(INGEST_REASONS.unsupportedType);
    }
  }
  const text = normalizeWhitespace(raw);
  if (text.length === 0) throw new IngestError(INGEST_REASONS.noText);
  return text;
}
