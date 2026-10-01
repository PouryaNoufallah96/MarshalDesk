import {
  REALTIME_PARTIES,
  REALTIME_PUBLISH_PATH_PREFIX,
  type ConversationEvent,
  type Source,
  type WorkspaceEvent,
} from "@marshaldesk/shared";
import type { SourceRecord } from "@marshaldesk/db";
import { errorMessage } from "./log";

const PUBLISH_TIMEOUT_MS = 2000;

export type Publication =
  | { party: "conversation"; room: string; event: ConversationEvent }
  | { party: "workspace"; room: string; event: WorkspaceEvent };

/** Delivers one event. Never throws: the write it follows has already been saved. */
async function publish(publication: Publication): Promise<boolean> {
  const baseUrl = process.env["REALTIME_URL"];
  const secret = process.env["REALTIME_PUBLISH_SECRET"];
  const { party, room, event } = publication;
  if (!baseUrl || !secret) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "realtime.publish",
        type: event.type,
        party,
        room,
        message: "REALTIME_URL or REALTIME_PUBLISH_SECRET is not set",
      }),
    );
    return false;
  }

  const url = `${baseUrl.replace(/\/$/, "")}/${REALTIME_PUBLISH_PATH_PREFIX}/${REALTIME_PARTIES[party]}/${encodeURIComponent(room)}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
    });
    console.log(
      JSON.stringify({
        level: response.ok ? "info" : "error",
        event: "realtime.publish",
        type: event.type,
        party,
        room,
        status: response.status,
      }),
    );
    return response.ok;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "realtime.publish",
        type: event.type,
        party,
        room,
        message: errorMessage(error),
      }),
    );
    return false;
  }
}

export function publishWorkspaceEvent(
  workspaceId: string,
  event: WorkspaceEvent,
): Promise<boolean> {
  return publish({ party: "workspace", room: workspaceId, event });
}

/**
 * Publishes one at a time so clients see events in order. After a failure the
 * rest are skipped, so an unreachable server costs one timeout, not one per event.
 */
export async function publishInOrder(
  publications: readonly Publication[],
): Promise<void> {
  for (const publication of publications) {
    if (!(await publish(publication))) return;
  }
}

export function toSource(record: SourceRecord): Source {
  return {
    id: record.id,
    kind: record.kind,
    name: record.name,
    status: record.status,
    error: record.error,
    size: record.size,
    chunkCount: record.chunkCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function publishSourceUpdated(
  workspaceId: string,
  source: SourceRecord,
): Promise<boolean> {
  return publishWorkspaceEvent(workspaceId, {
    type: "source.updated",
    source: toSource(source),
  });
}
