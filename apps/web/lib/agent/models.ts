import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { createNeon } from "@neon/ai-sdk-provider";
import { AGENT_MODELS, EMBEDDING_MODEL } from "@marshaldesk/shared";
import type { EmbeddingModel, LanguageModel } from "ai";

export type AgentModelSpec = (typeof AGENT_MODELS)[keyof typeof AGENT_MODELS];

function gatewayEnv(): { baseURL: string; apiKey: string } {
  const baseURL = process.env["NEON_AI_GATEWAY_BASE_URL"];
  const apiKey = process.env["NEON_AI_GATEWAY_TOKEN"];
  if (!baseURL || !apiKey) {
    throw new Error("The Neon AI Gateway isn't configured");
  }
  return { baseURL: baseURL.replace(/\/$/, ""), apiKey };
}

let neonProvider: ReturnType<typeof createNeon> | null = null;
let embeddingProvider: ReturnType<typeof createOpenAI> | null = null;

export function languageModel(spec: AgentModelSpec): LanguageModel {
  if (!neonProvider) {
    neonProvider = createNeon(gatewayEnv());
  }
  return neonProvider(spec.id);
}

/** GPT models ignore the `neon` key; the effort must go under `openai`. */
export function reasoningOptions(spec: AgentModelSpec) {
  return { openai: { reasoningEffort: spec.reasoningEffort } };
}

export function embeddingModel(): EmbeddingModel {
  if (!embeddingProvider) {
    const { baseURL, apiKey } = gatewayEnv();
    embeddingProvider = createOpenAI({ baseURL: `${baseURL}/v1`, apiKey });
  }
  return embeddingProvider.embedding(EMBEDDING_MODEL);
}
