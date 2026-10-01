import "server-only";
import {
  FUNCTION_ROUTES,
  type SuggestedQuestionsRequest,
  type TextIngestRequest,
} from "@marshaldesk/shared";

const FUNCTION_TIMEOUT_MS = 10_000;

/** Calls a route of the `jobs` Neon Function. Never throws; `false` on any failure. */
async function callFunction(
  route: (typeof FUNCTION_ROUTES)["ingestText" | "suggestedQuestions"],
  body: TextIngestRequest | SuggestedQuestionsRequest,
): Promise<boolean> {
  const baseUrl = process.env["FUNCTIONS_URL"];
  const secret = process.env["FUNCTIONS_SECRET"];
  if (!baseUrl || !secret) {
    console.error(
      `Can't call ${route}: FUNCTIONS_URL or FUNCTIONS_SECRET is unset`,
    );
    return false;
  }
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${route}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FUNCTION_TIMEOUT_MS),
    });
    if (response.ok) return true;
    console.error(`Function call ${route} failed with ${response.status}`);
  } catch (error) {
    console.error(
      `Function call ${route} failed:`,
      error instanceof Error ? error.message : error,
    );
  }
  return false;
}

export function requestTextIngest(
  workspaceId: string,
  sourceId: string,
): Promise<boolean> {
  return callFunction(FUNCTION_ROUTES.ingestText, { workspaceId, sourceId });
}

export function requestSuggestedQuestions(
  workspaceId: string,
): Promise<boolean> {
  return callFunction(FUNCTION_ROUTES.suggestedQuestions, { workspaceId });
}
