import { randomUUID } from "node:crypto";
import { and } from "@prisma/orm-postgres/orm-client";
import type { Temporal } from "temporal-polyfill";
import { getDb, type Db } from "./client";
import { isUniqueViolation } from "./errors";

type Instant = Temporal.Instant;

export type SourceKindValue = "file" | "text";
export type SourceStatusValue = "uploaded" | "processing" | "ready" | "failed";

export type SourceRecord = {
  id: string;
  kind: SourceKindValue;
  name: string;
  status: SourceStatusValue;
  error: string | null;
  size: number;
  chunkCount: number;
  storageKey: string | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceDetailRecord = SourceRecord & { text: string | null };

const sourceFields = [
  "id",
  "kind",
  "name",
  "status",
  "error",
  "size",
  "chunkCount",
  "storageKey",
  "mimeType",
  "createdAt",
  "updatedAt",
] as const;

type SourceRow = Omit<SourceRecord, "createdAt" | "updatedAt"> & {
  createdAt: { toString(): string };
  updatedAt: { toString(): string };
};

function toSourceRecord(row: SourceRow): SourceRecord {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    status: row.status,
    error: row.error,
    size: row.size,
    chunkCount: row.chunkCount,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    createdAt: row.createdAt.toString(),
    updatedAt: row.updatedAt.toString(),
  };
}

// Prisma suffixes index names with a hash that changes with the index.
const ONE_FILE_PER_NAME_INDEX = { prefix: "sources_one_file_per_name" };

export async function listSources(
  workspaceId: string,
): Promise<SourceRecord[]> {
  const rows = await getDb()
    .orm.public.Source.select(...sourceFields)
    .where({ workspaceId })
    .orderBy([(s) => s.createdAt.desc(), (s) => s.id.desc()])
    .all();
  return rows.map(toSourceRecord);
}

export async function getSource(
  workspaceId: string,
  sourceId: string,
): Promise<SourceDetailRecord | null> {
  const row = await getDb()
    .orm.public.Source.select(...sourceFields, "text")
    .where({ id: sourceId, workspaceId })
    .first();
  return row ? { ...toSourceRecord(row), text: row.text } : null;
}

async function findFileSourceByName(
  workspaceId: string,
  name: string,
): Promise<SourceRecord | null> {
  const row = await getDb()
    .orm.public.Source.select(...sourceFields)
    .where({ workspaceId, kind: "file", name })
    .first();
  return row ? toSourceRecord(row) : null;
}

async function readSource(
  runner: Pick<Db, "orm">,
  workspaceId: string,
  sourceId: string,
): Promise<SourceRecord | null> {
  const row = await runner.orm.public.Source.select(...sourceFields)
    .where({ id: sourceId, workspaceId })
    .first();
  return row ? toSourceRecord(row) : null;
}

/**
 * Creates the file source a presigned upload will fill, or reuses the one with
 * the same name. A source that's still answering keeps its status, error and
 * size until the new file is ingested, so an upload that never lands changes
 * nothing; one with nothing ingested goes back to `uploaded`.
 */
export async function upsertFileSource(
  workspaceId: string,
  input: {
    name: string;
    size: number;
    mimeType: string;
    storageKeyFor: (sourceId: string) => string;
  },
): Promise<{ source: SourceRecord; replaced: boolean }> {
  const db = getDb();
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await findFileSourceByName(workspaceId, input.name);
    if (existing) {
      const plan = db.raw.sql`
        UPDATE sources
        SET size = CASE WHEN chunk_count > 0 THEN size ELSE ${input.size}::int END,
            mime_type = ${input.mimeType},
            storage_key = ${input.storageKeyFor(existing.id)},
            status = CASE WHEN chunk_count > 0 THEN status ELSE 'uploaded' END,
            error = CASE WHEN chunk_count > 0 THEN error ELSE NULL END,
            updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
        WHERE id = ${existing.id}::uuid AND workspace_id = ${workspaceId}::uuid
        RETURNING id`
        .returnsRow({ id: "pg/uuid@1" })
        .build();
      const [updated] = await db.runtime().query(plan);
      const source = updated
        ? await readSource(db, workspaceId, existing.id)
        : null;
      if (source) return { source, replaced: true };
      continue;
    }
    const id = randomUUID();
    try {
      const row = await db.orm.public.Source.select(...sourceFields).create({
        id,
        workspaceId,
        kind: "file",
        name: input.name,
        storageKey: input.storageKeyFor(id),
        mimeType: input.mimeType,
        size: input.size,
        status: "uploaded",
      });
      return { source: toSourceRecord(row), replaced: false };
    } catch (error) {
      if (!isUniqueViolation(error, ONE_FILE_PER_NAME_INDEX)) throw error;
    }
  }
  throw new Error(`Couldn't create or reuse the source ${input.name}`);
}

/**
 * A text save claims a revision like an ingest run does, so a failure to start
 * processing it can be recorded without overwriting a newer save.
 */
export type TextSourceSave = { source: SourceRecord; revision: number };

export async function createTextSource(
  workspaceId: string,
  input: { title: string; text: string },
): Promise<TextSourceSave> {
  const revision = 1;
  const row = await getDb()
    .orm.public.Source.select(...sourceFields)
    .create({
      workspaceId,
      kind: "text",
      name: input.title,
      text: input.text,
      size: input.text.length,
      status: "uploaded",
      revision,
    });
  return { source: toSourceRecord(row), revision };
}

/** `null` when there's no text source with this id in the workspace. */
export async function updateTextSource(
  workspaceId: string,
  sourceId: string,
  input: { title: string; text: string },
): Promise<TextSourceSave | null> {
  const db = getDb();
  const plan = db.raw.sql`
    UPDATE sources
    SET name = ${input.title},
        text = ${input.text},
        size = ${input.text.length}::int,
        status = 'uploaded',
        error = NULL,
        revision = revision + 1,
        updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
    WHERE id = ${sourceId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND kind = 'text'
    RETURNING revision`
    .returnsRow({ revision: "pg/int4@1" })
    .build();
  const [updated] = await db.runtime().query(plan);
  if (!updated) return null;
  const source = await readSource(db, workspaceId, sourceId);
  return source ? { source, revision: updated.revision } : null;
}

/** Deletes the source and, by cascade, its chunks. Returns what was deleted. */
export async function deleteSource(
  workspaceId: string,
  sourceId: string,
): Promise<SourceRecord | null> {
  const row = await getDb()
    .orm.public.Source.select(...sourceFields)
    .where({ id: sourceId, workspaceId })
    .delete();
  return row ? toSourceRecord(row) : null;
}

type FailureGuard = {
  revision: number;
  status?: SourceStatusValue;
  updatedBefore?: Instant;
};

/**
 * Records a failed version. A source that still has chunks from an earlier
 * success stays `ready` with the reason, so the previous version keeps
 * answering; one without becomes `failed`. `null` when the guard doesn't match.
 */
async function failSource(
  workspaceId: string,
  sourceId: string,
  guard: FailureGuard,
  error: string,
): Promise<SourceRecord | null> {
  const db = getDb();
  const status = guard.status ?? "";
  const before = guard.updatedBefore?.toString() ?? "";
  return db.transaction(async (tx) => {
    const plan = db.raw.sql`
      UPDATE sources
      SET status = CASE WHEN chunk_count > 0 THEN 'ready' ELSE 'failed' END,
          error = ${error},
          ingested_etag = CASE WHEN chunk_count > 0 THEN ingested_etag END,
          updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
      WHERE id = ${sourceId}::uuid
        AND workspace_id = ${workspaceId}::uuid
        AND revision = ${guard.revision}::int
        AND (${status} = '' OR status = ${status})
        AND (${before} = '' OR updated_at < NULLIF(${before}, '')::timestamptz)
      RETURNING status`
      .returnsRow({ status: "pg/text@1" })
      .build();
    const [updated] = await tx.query(plan);
    if (!updated) return null;
    if (updated.status === "failed") {
      await tx.orm.public.Chunk.where({ sourceId, workspaceId }).deleteAll();
    }
    return readSource(tx, workspaceId, sourceId);
  });
}

/**
 * Records that processing of a text save couldn't start, for example when the
 * web app couldn't reach the ingest function. Only while `revision` (from the
 * save) is still the latest, so a newer save or run is never overwritten.
 */
export function markSourceFailed(
  workspaceId: string,
  sourceId: string,
  revision: number,
  error: string,
): Promise<SourceRecord | null> {
  return failSource(workspaceId, sourceId, { revision }, error);
}

export type StaleSource = {
  workspaceId: string;
  id: string;
  kind: SourceKindValue;
  status: "uploaded" | "processing";
  revision: number;
};

/** Sources stuck in `uploaded` or `processing` since before `before`, oldest first. */
export async function listStaleSources(
  before: Instant,
  limit: number,
): Promise<StaleSource[]> {
  const rows = await getDb()
    .orm.public.Source.select("id", "workspaceId", "kind", "status", "revision")
    .where((s) =>
      and(s.status.in(["uploaded", "processing"]), s.updatedAt.lt(before)),
    )
    .orderBy([(s) => s.updatedAt.asc(), (s) => s.id.asc()])
    .limit(limit)
    .all();
  return rows.flatMap((row) => {
    switch (row.status) {
      case "uploaded":
      case "processing":
        return [{ ...row, status: row.status }];
      case "ready":
      case "failed":
        return [];
      default: {
        const unreachable: never = row.status;
        throw new Error(`Unknown source status ${String(unreachable)}`);
      }
    }
  });
}

/**
 * Gives a stuck source the failure treatment, guarded on it not having changed
 * since it was listed. `null` when it did.
 */
export function failStaleSource(
  source: StaleSource,
  before: Instant,
  error: string,
): Promise<SourceRecord | null> {
  return failSource(
    source.workspaceId,
    source.id,
    {
      revision: source.revision,
      status: source.status,
      updatedBefore: before,
    },
    error,
  );
}

// ---------------------------------------------------------------------------
// Ingest runs
//
// Every run claims the next revision before it reads the content, so the run
// that claims last always reads the newest file or text. Results are written
// only while the run's revision is still the latest, so a slow, stale run can
// never overwrite a newer one, and a deleted source stays deleted.

export type IngestClaim = {
  revision: number;
  kind: SourceKindValue;
  name: string;
  text: string | null;
  storageKey: string | null;
  source: SourceRecord;
};

export async function getSourceIngestState(
  workspaceId: string,
  sourceId: string,
): Promise<{
  status: SourceStatusValue;
  storageKey: string | null;
  ingestedEtag: string | null;
  error: string | null;
} | null> {
  return getDb()
    .orm.public.Source.select("status", "storageKey", "ingestedEtag", "error")
    .where({ id: sourceId, workspaceId })
    .first();
}

export async function claimSourceIngest(
  workspaceId: string,
  sourceId: string,
): Promise<IngestClaim | null> {
  const db = getDb();
  const plan = db.raw.sql`
    UPDATE sources
    SET revision = revision + 1,
        status = 'processing',
        error = NULL,
        updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
    WHERE id = ${sourceId}::uuid AND workspace_id = ${workspaceId}::uuid
    RETURNING id, revision`
    .returnsRow({ id: "pg/uuid@1", revision: "pg/int4@1" })
    .build();
  const [claimed] = await db.runtime().query(plan);
  if (!claimed) return null;
  const row = await db.orm.public.Source.select(...sourceFields, "text")
    .where({ id: sourceId, workspaceId })
    .first();
  if (!row) return null;
  return {
    revision: claimed.revision,
    kind: row.kind,
    name: row.name,
    text: row.text,
    storageKey: row.storageKey,
    source: toSourceRecord(row),
  };
}

export type ChunkDraft = {
  content: string;
  tokenCount: number;
  embedding: number[];
};

/**
 * Swaps the source's chunks for the new ones and marks it ready, in one
 * transaction. `null` when a newer run claimed the source or it was deleted.
 */
export async function completeSourceIngest(
  workspaceId: string,
  sourceId: string,
  revision: number,
  /** `size` is the stored file's real byte length; text sources omit it. */
  input: { chunks: readonly ChunkDraft[]; etag: string | null; size?: number },
): Promise<SourceRecord | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const plan = db.raw.sql`
      UPDATE sources
      SET status = 'ready',
          error = NULL,
          size = CASE WHEN ${input.size ?? -1}::int >= 0 THEN ${input.size ?? -1}::int ELSE size END,
          chunk_count = ${input.chunks.length}::int,
          ingested_etag = NULLIF(${input.etag ?? ""}, ''),
          updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
      WHERE id = ${sourceId}::uuid
        AND workspace_id = ${workspaceId}::uuid
        AND revision = ${revision}::int
      RETURNING id`
      .returnsRow({ id: "pg/uuid@1" })
      .build();
    const [updated] = await tx.query(plan);
    if (!updated) return null;
    await tx.orm.public.Chunk.where({ sourceId, workspaceId }).deleteAll();
    if (input.chunks.length > 0) {
      await tx.orm.public.Chunk.select("id").createAll(
        input.chunks.map((chunk, position) => ({
          workspaceId,
          sourceId,
          position,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          embedding: chunk.embedding,
        })),
      );
    }
    return readSource(tx, workspaceId, sourceId);
  });
}

/**
 * Records the run's readable failure reason (see `failSource` for what stays
 * answering). `null` when a newer run claimed the source or it was deleted.
 */
export function failSourceIngest(
  workspaceId: string,
  sourceId: string,
  revision: number,
  error: string,
): Promise<SourceRecord | null> {
  return failSource(workspaceId, sourceId, { revision }, error);
}
