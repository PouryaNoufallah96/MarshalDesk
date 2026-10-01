/**
 * Model choices for the agent and the knowledge base, shared by the web app
 * (answers) and the Neon Function (ingest, suggested questions). Every call
 * goes through the Neon AI Gateway and pins its reasoning effort, because the
 * models' default effort is slow.
 */
export const AGENT_MODELS = {
  classifier: { id: "gpt-5-4-nano", reasoningEffort: "none" },
  /** Off-topic refusals and small-talk replies. Never the answer model. */
  fast: { id: "gpt-5-4-nano", reasoningEffort: "none" },
  answer: { id: "gpt-5-6-terra", reasoningEffort: "none" },
  suggestedQuestions: { id: "gpt-5-6-terra", reasoningEffort: "medium" },
} as const satisfies Record<
  string,
  { id: string; reasoningEffort: "none" | "low" | "medium" }
>;

/**
 * Chunks and questions must be embedded with the same model and dimensions.
 * Vectors come back unit-normalized, so cosine similarity is the dot product.
 */
export const EMBEDDING_MODEL = "qwen3-embedding-0-6b";
export const EMBEDDING_DIMENSIONS = 1024;

/** Qwen3 embeddings expect an instruction on queries only, never on passages. */
export function embeddingQuery(question: string): string {
  return `Instruct: Given a customer support question, retrieve passages from the knowledge base that answer it\nQuery: ${question}`;
}

export const RETRIEVAL_TOP_K = 5;
/** The best chunk must reach this cosine similarity, or the question hands off. */
export const RETRIEVAL_MIN_SIMILARITY = 0.5;
/** Once one chunk is relevant, others this similar join it as context. */
export const RETRIEVAL_CONTEXT_SIMILARITY = 0.4;
/** Follow-ups this short are embedded together with the previous question. */
export const FOLLOW_UP_MAX_WORDS = 6;
export const AGENT_HISTORY_MESSAGES = 10;
