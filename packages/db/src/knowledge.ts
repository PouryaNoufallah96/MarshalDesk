import { and } from "@prisma/orm-postgres/orm-client";
import { getDb } from "./client";
import type {
  HandoffReasonValue,
  MessageClassificationValue,
} from "./conversations";

export type ChunkRecord = {
  id: string;
  position: number;
  content: string;
  tokenCount: number;
};

export async function listSourceChunks(
  workspaceId: string,
  sourceId: string,
): Promise<ChunkRecord[]> {
  return getDb()
    .orm.public.Chunk.select("id", "position", "content", "tokenCount")
    .where({ workspaceId, sourceId })
    .orderBy((c) => c.position.asc())
    .all();
}

/** Whether the agent has any ingested knowledge to answer from (PRD AI-1). */
export async function hasKnowledge(workspaceId: string): Promise<boolean> {
  const row = await getDb()
    .orm.public.Chunk.select("id")
    .where({ workspaceId })
    .first();
  return row !== null;
}

export type RetrievedChunk = {
  id: string;
  sourceId: string;
  sourceName: string;
  content: string;
  /** Cosine similarity, 1 is identical. */
  score: number;
};

/**
 * The workspace's chunks closest to `embedding`, best first. The MATERIALIZED
 * CTE keeps Postgres from ranking through the global HNSW index and filtering
 * afterwards, which could drop this workspace's matches behind other
 * workspaces' chunks. The vector goes in as a text literal because raw-plan
 * params with the vector codec fail.
 */
export async function searchChunks(
  workspaceId: string,
  embedding: number[],
  limit: number,
): Promise<RetrievedChunk[]> {
  const db = getDb();
  const vector = `[${embedding.join(",")}]`;
  const plan = db.raw.sql`
    WITH workspace_chunks AS MATERIALIZED (
      SELECT id, content, source_id, embedding
      FROM chunks
      WHERE workspace_id = ${workspaceId}::uuid
    )
    SELECT id, content, source_id,
      (1 - (embedding <=> ${vector}::vector))::float8 AS score
    FROM workspace_chunks
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}::int`
    .returnsRow({
      id: "pg/uuid@1",
      content: "pg/text@1",
      source_id: "pg/uuid@1",
      score: "pg/float8@1",
    })
    .build();
  const rows = await db.runtime().query(plan);
  if (rows.length === 0) return [];
  const sources = await db.orm.public.Source.select("id", "name")
    .where((s) =>
      and(
        s.workspaceId.eq(workspaceId),
        s.id.in([...new Set(rows.map((row) => row.source_id))]),
      ),
    )
    .all();
  const names = new Map(sources.map((source) => [source.id, source.name]));
  return rows.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    sourceName: names.get(row.source_id) ?? "",
    content: row.content,
    score: row.score,
  }));
}

export type KnowledgeSampleChunk = {
  sourceId: string;
  sourceName: string;
  position: number;
  content: string;
};

/** Chunks in reading order, each source's opening chunks first. */
export async function listKnowledgeSample(
  workspaceId: string,
  limit: number,
): Promise<KnowledgeSampleChunk[]> {
  const rows = await getDb()
    .orm.public.Chunk.select("sourceId", "position", "content")
    .include("source", (source) => source.select("name"))
    .where({ workspaceId })
    .orderBy([(c) => c.position.asc(), (c) => c.sourceId.asc()])
    .limit(limit)
    .all();
  return rows.map((row) => ({
    sourceId: row.sourceId,
    sourceName: row.source?.name ?? "",
    position: row.position,
    content: row.content,
  }));
}

/**
 * Identifies the knowledge base's current content, so suggested-question
 * generation can tell whether it changed while the model was working.
 */
export async function knowledgeFingerprint(
  workspaceId: string,
): Promise<string> {
  const plan = getDb().raw.sql`
    SELECT coalesce(string_agg(id::text || ':' || revision::text, ',' ORDER BY id), '') AS fingerprint
    FROM sources
    WHERE workspace_id = ${workspaceId}::uuid AND chunk_count > 0`
    .returnsRow({ fingerprint: "pg/text@1" })
    .build();
  const [row] = await getDb().runtime().query(plan);
  return row?.fingerprint ?? "";
}

export async function getSuggestedQuestions(
  workspaceId: string,
): Promise<string[]> {
  const row = await getDb()
    .orm.public.Workspace.select("suggestedQuestions")
    .where({ id: workspaceId })
    .first();
  return row ? [...row.suggestedQuestions] : [];
}

export async function setSuggestedQuestions(
  workspaceId: string,
  questions: readonly string[],
): Promise<void> {
  await getDb()
    .orm.public.Workspace.select("id")
    .where({ id: workspaceId })
    .update({ suggestedQuestions: [...questions] });
}

export type AgentTurnOutcomeValue =
  "answered" | "small_talk" | "declined" | "handoff" | "discarded" | "failed";

export type AgentTurnInput = {
  conversationId: string;
  messageId: string;
  replyMessageId: string | null;
  classification: MessageClassificationValue;
  outcome: AgentTurnOutcomeValue;
  handoffReason: HandoffReasonValue | null;
  chunkIds: readonly string[];
  scores: readonly number[];
  classifierModel: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  firstTokenMs: number | null;
  error: string | null;
};

/** PRD AI-11. */
export async function recordAgentTurn(
  workspaceId: string,
  input: AgentTurnInput,
): Promise<void> {
  await getDb()
    .orm.public.AgentTurn.select("id")
    .create({
      workspaceId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      replyMessageId: input.replyMessageId,
      classification: input.classification,
      outcome: input.outcome,
      handoffReason: input.handoffReason,
      chunkIds: [...input.chunkIds],
      scores: [...input.scores],
      classifierModel: input.classifierModel,
      model: input.model,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      latencyMs: Math.round(input.latencyMs),
      firstTokenMs:
        input.firstTokenMs === null ? null : Math.round(input.firstTokenMs),
      error: input.error,
    });
}
