import "server-only";
import type {
  MessageClassificationValue,
  MessageRecord,
} from "@marshaldesk/db";
import { AGENT_MODELS } from "@marshaldesk/shared";
import { generateText, Output } from "ai";
import { z } from "zod";
import { languageModel, reasoningOptions } from "./models";
import { CLASSIFIER_SYSTEM, classifierPrompt } from "./prompts";

const CLASSIFIER_TIMEOUT_MS = 8000;

const classificationSchema = z.object({
  label: z.enum([
    "support_question",
    "small_talk",
    "off_topic",
    "human_request",
  ]),
});

export type Classification = {
  label: MessageClassificationValue;
  tokensIn: number;
  tokensOut: number;
  /** Set when the classifier failed and the label is the fallback. */
  error: string | null;
};

/**
 * Never throws. Anything unexpected counts as a support question, so a broken
 * classifier hands off or answers from knowledge instead of declining.
 */
export async function classifyMessage(
  history: readonly MessageRecord[],
  message: string,
): Promise<Classification> {
  const spec = AGENT_MODELS.classifier;
  try {
    const result = await generateText({
      model: languageModel(spec),
      system: CLASSIFIER_SYSTEM,
      prompt: classifierPrompt(history, message),
      output: Output.object({ schema: classificationSchema }),
      providerOptions: reasoningOptions(spec),
      maxOutputTokens: 100,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(CLASSIFIER_TIMEOUT_MS),
    });
    return {
      label: result.output.label,
      tokensIn: result.usage.inputTokens ?? 0,
      tokensOut: result.usage.outputTokens ?? 0,
      error: null,
    };
  } catch (error) {
    return {
      label: "support_question",
      tokensIn: 0,
      tokensOut: 0,
      error: `classifier: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
