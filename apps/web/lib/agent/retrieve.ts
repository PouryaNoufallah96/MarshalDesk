import "server-only";
import { searchChunks, type RetrievedChunk } from "@marshaldesk/db";
import {
  EMBEDDING_DIMENSIONS,
  embeddingQuery,
  FOLLOW_UP_MAX_WORDS,
  RETRIEVAL_CONTEXT_SIMILARITY,
  RETRIEVAL_MIN_SIMILARITY,
  RETRIEVAL_TOP_K,
} from "@marshaldesk/shared";
import { embedMany } from "ai";
import { embeddingModel } from "./models";

const EMBEDDING_TIMEOUT_MS = 8000;

export type Retrieval = {
  /** Every chunk retrieved, best first, with its score. */
  retrieved: RetrievedChunk[];
  /** The chunks similar enough to answer from. */
  relevant: RetrievedChunk[];
  tokensIn: number;
  /**
   * For a short question that could be a follow-up: the best score of the
   * question alone and merged with the previous one, e.g. `alone=0.61 merged=0.42`.
   */
  followUpScores: string | null;
};

async function embedQueries(
  queries: readonly string[],
): Promise<{ vectors: number[][]; tokens: number }> {
  const result = await embedMany({
    model: embeddingModel(),
    values: queries.map(embeddingQuery),
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
  });
  if (result.embeddings.length !== queries.length) {
    throw new Error(
      `The embedding model returned ${result.embeddings.length} vectors for ${queries.length} queries`,
    );
  }
  for (const vector of result.embeddings) {
    if (
      vector.length !== EMBEDDING_DIMENSIONS ||
      vector.every((value) => value === 0)
    ) {
      throw new Error(
        `The embedding model returned an unusable vector (${vector.length} dimensions)`,
      );
    }
  }
  return { vectors: result.embeddings, tokens: result.usage.tokens };
}

function bestScore(chunks: readonly RetrievedChunk[]): number {
  return chunks[0]?.score ?? 0;
}

/**
 * A short follow-up like "and on the Pro plan?" only means something with the
 * question before it, but a short standalone question doesn't, so both are
 * searched and the closer match wins.
 */
async function search(
  workspaceId: string,
  question: string,
  previousQuestion: string | null,
): Promise<Omit<Retrieval, "relevant">> {
  const words = question.trim().split(/\s+/).length;
  if (!previousQuestion || words > FOLLOW_UP_MAX_WORDS) {
    const { vectors, tokens } = await embedQueries([question]);
    const [vector] = vectors;
    if (!vector) throw new Error("The embedding model returned no vector");
    return {
      retrieved: await searchChunks(workspaceId, vector, RETRIEVAL_TOP_K),
      tokensIn: tokens,
      followUpScores: null,
    };
  }
  const { vectors, tokens } = await embedQueries([
    question,
    `${previousQuestion}\n${question}`,
  ]);
  const [aloneVector, mergedVector] = vectors;
  if (!aloneVector || !mergedVector) {
    throw new Error("The embedding model returned too few vectors");
  }
  const [alone, merged] = await Promise.all([
    searchChunks(workspaceId, aloneVector, RETRIEVAL_TOP_K),
    searchChunks(workspaceId, mergedVector, RETRIEVAL_TOP_K),
  ]);
  return {
    retrieved: bestScore(merged) > bestScore(alone) ? merged : alone,
    tokensIn: tokens,
    followUpScores: `alone=${bestScore(alone).toFixed(3)} merged=${bestScore(merged).toFixed(3)}`,
  };
}

export async function retrieveKnowledge(
  workspaceId: string,
  question: string,
  previousQuestion: string | null,
): Promise<Retrieval> {
  const { retrieved, tokensIn, followUpScores } = await search(
    workspaceId,
    question,
    previousQuestion,
  );
  const best = bestScore(retrieved);
  return {
    retrieved,
    relevant:
      best >= RETRIEVAL_MIN_SIMILARITY
        ? retrieved.filter(
            (chunk) => chunk.score >= RETRIEVAL_CONTEXT_SIMILARITY,
          )
        : [],
    tokensIn,
    followUpScores,
  };
}
