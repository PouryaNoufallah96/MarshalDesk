import { createOpenAI } from "@ai-sdk/openai";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@marshaldesk/shared";
import { createNeon } from "@neon/ai-sdk-provider";
import { embedMany } from "ai";
import { requireEnv } from "./env";

const EMBEDDING_BATCH_SIZE = 32;
/** The AI SDK retries 429 and 5xx responses with exponential backoff. */
const EMBEDDING_MAX_RETRIES = 2;
/** Per batch, retries included, so a hung gateway fails the run instead of stalling it. */
const EMBEDDING_BATCH_TIMEOUT_MS = 60_000;

let neonProvider: ReturnType<typeof createNeon> | undefined;
let openaiProvider: ReturnType<typeof createOpenAI> | undefined;

export function neon(): ReturnType<typeof createNeon> {
  neonProvider ??= createNeon({
    baseURL: requireEnv("NEON_AI_GATEWAY_BASE_URL").replace(/\/$/, ""),
    apiKey: requireEnv("NEON_AI_GATEWAY_TOKEN"),
  });
  return neonProvider;
}

// The Neon provider can't embed, so embeddings go through the gateway's
// OpenAI-compatible endpoint.
function embeddingProvider(): ReturnType<typeof createOpenAI> {
  openaiProvider ??= createOpenAI({
    baseURL: `${requireEnv("NEON_AI_GATEWAY_BASE_URL").replace(/\/$/, "")}/v1`,
    apiKey: requireEnv("NEON_AI_GATEWAY_TOKEN"),
  });
  return openaiProvider;
}

function assertEmbedding(vector: readonly number[]): void {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding has ${vector.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`,
    );
  }
  if (vector.every((value) => value === 0)) {
    throw new Error("Embedding is all zeros");
  }
}

/** Embeds passages (no query instruction), in order, in sequential batches. */
export async function embedPassages(
  passages: readonly string[],
): Promise<number[][]> {
  const model = embeddingProvider().embedding(EMBEDDING_MODEL);
  const vectors: number[][] = [];
  for (let i = 0; i < passages.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = passages.slice(i, i + EMBEDDING_BATCH_SIZE);
    const { embeddings } = await embedMany({
      model,
      values: batch,
      maxRetries: EMBEDDING_MAX_RETRIES,
      abortSignal: AbortSignal.timeout(EMBEDDING_BATCH_TIMEOUT_MS),
    });
    if (embeddings.length !== batch.length) {
      throw new Error(
        `Got ${embeddings.length} embeddings for ${batch.length} passages`,
      );
    }
    for (const embedding of embeddings) {
      assertEmbedding(embedding);
      vectors.push(embedding);
    }
  }
  return vectors;
}
