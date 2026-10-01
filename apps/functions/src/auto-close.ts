import {
  closeIdleConversation,
  getConversationSummary,
  getMessagesByIds,
  listIdleConversations,
} from "@marshaldesk/db";
import {
  systemEventSchema,
  toConversation,
  toConversationSummary,
  type Message,
} from "@marshaldesk/shared";
import { Temporal } from "temporal-polyfill";
import { logError } from "./log";
import { publishInOrder, type Publication } from "./realtime";

/** PRD D-5. */
const IDLE_HOURS = 24;
const BATCH_SIZE = 200;
const MAX_BATCHES = 10;

async function publishClosed(
  workspaceId: string,
  conversationId: string,
  messageIds: readonly string[],
): Promise<void> {
  const [messages, summary] = await Promise.all([
    getMessagesByIds(workspaceId, conversationId, messageIds),
    getConversationSummary(workspaceId, conversationId),
  ]);
  if (!summary) return;
  const publications: Publication[] = [];
  for (const record of messages) {
    const event = systemEventSchema.safeParse(record.event);
    if (record.author !== "system" || !event.success) continue;
    const message: Message = {
      id: record.id,
      conversationId: record.conversationId,
      createdAt: record.createdAt,
      author: "system",
      event: event.data,
    };
    publications.push({
      party: "conversation",
      room: conversationId,
      event: { type: "message.created", conversationId, message },
    });
  }
  publications.push(
    {
      party: "conversation",
      room: conversationId,
      event: {
        type: "conversation.updated",
        conversation: toConversation(summary),
      },
    },
    {
      party: "workspace",
      room: workspaceId,
      event: {
        type: "conversation.upserted",
        summary: toConversationSummary(summary),
      },
    },
  );
  await publishInOrder(publications);
}

/** Closes every conversation idle for 24 hours. Returns how many it closed. */
export async function closeIdleConversations(): Promise<number> {
  const before = Temporal.Now.instant().subtract({ hours: IDLE_HOURS });
  let closed = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const idle = await listIdleConversations(before, BATCH_SIZE);
    for (const { workspaceId, conversationId } of idle) {
      try {
        const messageIds = await closeIdleConversation(
          workspaceId,
          conversationId,
          before,
        );
        if (!messageIds) continue;
        closed++;
        await publishClosed(workspaceId, conversationId, messageIds);
      } catch (error) {
        logError("auto-close", { workspaceId, conversationId }, error);
      }
    }
    if (idle.length < BATCH_SIZE) break;
  }
  return closed;
}
