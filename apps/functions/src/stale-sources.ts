import {
  failStaleSource,
  listStaleSources,
  type StaleSource,
} from "@marshaldesk/db";
import { Temporal } from "temporal-polyfill";
import { logError, logInfo } from "./log";
import { publishSourceUpdated } from "./realtime";
import { regenerateSuggestedQuestions } from "./suggested-questions";

const STALE_MINUTES = 15;
const BATCH_SIZE = 200;
const MAX_BATCHES = 10;

function staleReason(source: StaleSource): string {
  switch (source.kind) {
    case "text":
      return "Processing didn't finish. Save it again.";
    case "file":
      switch (source.status) {
        case "processing":
          return "Processing didn't finish. Upload the file again.";
        case "uploaded":
          return "The upload didn't finish. Upload the file again.";
        default: {
          const unreachable: never = source.status;
          throw new Error(`Unknown source status ${String(unreachable)}`);
        }
      }
    default: {
      const unreachable: never = source.kind;
      throw new Error(`Unknown source kind ${String(unreachable)}`);
    }
  }
}

/**
 * Fails sources stuck in `uploaded` or `processing` for 15 minutes, so none
 * waits forever. Returns how many it failed and the workspaces they're in.
 */
export async function failStaleSources(): Promise<{
  failed: number;
  workspaceIds: string[];
}> {
  const before = Temporal.Now.instant().subtract({ minutes: STALE_MINUTES });
  const workspaceIds = new Set<string>();
  let failed = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const stale = await listStaleSources(before, BATCH_SIZE);
    for (const source of stale) {
      const fields = { workspaceId: source.workspaceId, sourceId: source.id };
      try {
        const updated = await failStaleSource(
          source,
          before,
          staleReason(source),
        );
        if (!updated) continue;
        failed++;
        workspaceIds.add(source.workspaceId);
        logInfo("stale_source.failed", {
          ...fields,
          was: source.status,
          now: updated.status,
        });
        await publishSourceUpdated(source.workspaceId, updated);
      } catch (error) {
        logError("stale_source", fields, error);
      }
    }
    if (stale.length < BATCH_SIZE) break;
  }
  return { failed, workspaceIds: [...workspaceIds] };
}

export async function regenerateAfterSweep(
  workspaceIds: readonly string[],
): Promise<void> {
  for (const workspaceId of workspaceIds) {
    try {
      await regenerateSuggestedQuestions(workspaceId);
    } catch (error) {
      logError("stale_source.suggested_questions", { workspaceId }, error);
    }
  }
}
