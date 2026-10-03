import {
  claimSourceIngest,
  completeSourceIngest,
  failSourceIngest,
  type IngestClaim,
} from "@marshaldesk/db";
import { parseSourceStorageKey, SOURCE_MAX_BYTES } from "@marshaldesk/shared";
import { embedPassages } from "./ai";
import { chunkText } from "./chunk";
import { errorMessage, logError, logInfo } from "./log";
import {
  INGEST_REASONS,
  IngestError,
  normalizeWhitespace,
  parseFile,
} from "./parse";
import { publishSourceUpdated } from "./realtime";
import { downloadUpload } from "./storage";
import { regenerateSuggestedQuestions } from "./suggested-questions";

type Content = { text: string; etag: string | null; size?: number };

async function loadContent(claim: IngestClaim): Promise<Content> {
  switch (claim.kind) {
    case "text": {
      const text = normalizeWhitespace(claim.text ?? "");
      if (!text) throw new IngestError(INGEST_REASONS.noText);
      return { text, etag: null };
    }
    case "file": {
      const parsed = claim.storageKey
        ? parseSourceStorageKey(claim.storageKey)
        : null;
      if (!claim.storageKey || !parsed) {
        throw new IngestError(INGEST_REASONS.unsupportedType);
      }
      const download = await downloadUpload(claim.storageKey, SOURCE_MAX_BYTES);
      switch (download.kind) {
        case "missing":
          throw new IngestError(INGEST_REASONS.missingFile);
        case "too_large":
          throw new IngestError(INGEST_REASONS.tooLarge);
        case "ok":
          return {
            text: await parseFile(parsed.extension, download.bytes),
            etag: download.etag,
            size: download.bytes.byteLength,
          };
        default: {
          const unreachable: never = download;
          throw new Error(`Unknown download result ${String(unreachable)}`);
        }
      }
    }
    default: {
      const unreachable: never = claim.kind;
      throw new Error(`Unknown source kind ${String(unreachable)}`);
    }
  }
}

/**
 * Parses, chunks and embeds the source's current content, then swaps it in.
 * Safe to run twice or concurrently: only the run that claimed last writes.
 */
export async function ingestSource(
  workspaceId: string,
  sourceId: string,
): Promise<void> {
  const claim = await claimSourceIngest(workspaceId, sourceId);
  if (!claim) {
    logInfo("ingest.gone", { workspaceId, sourceId });
    return;
  }
  await publishSourceUpdated(workspaceId, claim.source);
  const started = Date.now();

  try {
    const { text, etag, size } = await loadContent(claim);
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new IngestError(INGEST_REASONS.noText);

    let embeddings: number[][];
    try {
      embeddings = await embedPassages(chunks.map((chunk) => chunk.content));
    } catch (error) {
      logError(
        "ingest.embed",
        { workspaceId, sourceId, revision: claim.revision },
        error,
      );
      throw new IngestError(INGEST_REASONS.embedding);
    }

    const completed = await completeSourceIngest(
      workspaceId,
      sourceId,
      claim.revision,
      {
        chunks: chunks.map((chunk, i) => ({
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          embedding: embeddings[i] ?? [],
        })),
        etag,
        ...(size === undefined ? {} : { size }),
      },
    );
    if (!completed) {
      logInfo("ingest.stale", {
        workspaceId,
        sourceId,
        revision: claim.revision,
      });
      return;
    }
    logInfo("ingest.ready", {
      workspaceId,
      sourceId,
      revision: claim.revision,
      chunks: chunks.length,
      chars: text.length,
      ms: Date.now() - started,
    });
    await publishSourceUpdated(workspaceId, completed);
  } catch (error) {
    const reason =
      error instanceof IngestError ? error.reason : INGEST_REASONS.generic;
    if (!(error instanceof IngestError)) {
      logError(
        "ingest",
        { workspaceId, sourceId, revision: claim.revision },
        error,
      );
    }
    const failed = await failSourceIngest(
      workspaceId,
      sourceId,
      claim.revision,
      reason,
    );
    if (!failed) {
      logInfo("ingest.stale", {
        workspaceId,
        sourceId,
        revision: claim.revision,
      });
      return;
    }
    logInfo("ingest.failed", {
      workspaceId,
      sourceId,
      revision: claim.revision,
      reason: errorMessage(error),
    });
    await publishSourceUpdated(workspaceId, failed);
  }

  await regenerateSuggestedQuestions(workspaceId);
}
