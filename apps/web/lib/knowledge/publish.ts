import "server-only";
import type { SourceRecord } from "@marshaldesk/db";
import type { Source } from "@marshaldesk/shared";
import { publishWorkspaceEvent } from "@/lib/realtime/publish";

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

export async function publishSourceUpdated(
  workspaceId: string,
  source: Source,
): Promise<void> {
  await publishWorkspaceEvent(workspaceId, { type: "source.updated", source });
}

export async function publishSourceDeleted(
  workspaceId: string,
  sourceId: string,
): Promise<void> {
  await publishWorkspaceEvent(workspaceId, {
    type: "source.deleted",
    sourceId,
  });
}
