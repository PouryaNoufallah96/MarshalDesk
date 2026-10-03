import type { KnowledgeBase, Source } from "@marshaldesk/shared";
import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import { isOlder } from "@/lib/realtime/messages";

/**
 * The only place that writes knowledge base data into the query cache, from
 * our own requests and from workspace events alike.
 */

export function knowledgeKey() {
  return orpc.knowledge.key();
}

function updateKnowledge(
  queryClient: QueryClient,
  update: (current: KnowledgeBase) => KnowledgeBase,
): void {
  queryClient.setQueryData(orpc.knowledge.get.queryKey(), (current) =>
    current ? update(current) : current,
  );
}

/** An update published before a delete can arrive after it. */
const DELETED_TTL_MS = 60_000;
const deletedAt = new Map<string, number>();

function wasDeleted(id: string): boolean {
  const at = deletedAt.get(id);
  if (at === undefined) return false;
  if (Date.now() - at < DELETED_TTL_MS) return true;
  deletedAt.delete(id);
  return false;
}

/** Adds a source or replaces the cached one, ignoring updates older than what we have. */
export function receiveSource(queryClient: QueryClient, source: Source): void {
  if (wasDeleted(source.id)) return;
  updateKnowledge(queryClient, (current) => {
    const existing = current.sources.find((item) => item.id === source.id);
    if (existing && isOlder(source, existing)) return current;
    const sources = existing
      ? current.sources.map((item) => (item.id === source.id ? source : item))
      : [source, ...current.sources];
    return {
      ...current,
      sources,
      hasKnowledge:
        current.hasKnowledge ||
        (source.status === "ready" && source.chunkCount > 0),
    };
  });
  const input = { id: source.id };
  void queryClient.invalidateQueries({
    queryKey: orpc.knowledge.getSource.queryKey({ input }),
  });
  void queryClient.invalidateQueries({
    queryKey: orpc.knowledge.listChunks.queryKey({ input }),
  });
}

export function removeSource(queryClient: QueryClient, id: string): void {
  deletedAt.set(id, Date.now());
  updateKnowledge(queryClient, (current) => {
    const sources = current.sources.filter((item) => item.id !== id);
    return {
      ...current,
      sources,
      hasKnowledge: sources.some((item) => item.chunkCount > 0),
    };
  });
  queryClient.removeQueries({
    queryKey: orpc.knowledge.getSource.queryKey({ input: { id } }),
  });
  queryClient.removeQueries({
    queryKey: orpc.knowledge.listChunks.queryKey({ input: { id } }),
  });
}

export function receiveKnowledgeState(
  queryClient: QueryClient,
  state: Pick<KnowledgeBase, "suggestedQuestions" | "hasKnowledge">,
): void {
  updateKnowledge(queryClient, (current) => ({ ...current, ...state }));
}
