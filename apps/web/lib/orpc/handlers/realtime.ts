import "server-only";
import { hasConversation } from "@marshaldesk/db";
import type {
  Conversation,
  ConversationSummary,
  Message,
} from "@marshaldesk/shared";
import { publishInOrder, type Publication } from "@/lib/realtime/publish";
import { signRealtimeToken } from "@/lib/realtime/token";
import { ownerProcedure } from "../procedures";

export const getToken = ownerProcedure.realtime.getToken.handler(
  async ({ context, input, errors }) => {
    const owner = {
      role: "owner",
      workspaceId: context.workspaceId,
      memberId: context.member.id,
    } as const;
    if (!input.conversationId) {
      return { token: await signRealtimeToken(owner) };
    }
    if (!(await hasConversation(context.workspaceId, input.conversationId))) {
      throw errors.NOT_FOUND();
    }
    return {
      token: await signRealtimeToken({
        ...owner,
        conversationId: input.conversationId,
      }),
    };
  },
);

function conversationOf(summary: ConversationSummary): Conversation {
  return {
    id: summary.id,
    state: summary.state,
    handoffReason: summary.handoffReason,
    createdAt: summary.createdAt,
    lastMessageAt: summary.lastMessageAt,
    closedAt: summary.closedAt,
  };
}

/** Strips anything beyond the summary, like a detail's messages. */
function summaryOf(summary: ConversationSummary): ConversationSummary {
  return {
    ...conversationOf(summary),
    visitor: summary.visitor,
    unread: summary.unread,
    preview: summary.preview,
  };
}

/**
 * Publishes a saved change: each new message to the conversation room, the
 * conversation when its state changed, and the fresh summary to the workspace
 * room (plus `visitor.message` for each visitor message).
 *
 * Awaited inside the request, one event at a time, so events leave in the
 * order they were written; each is time-boxed and failures only log.
 */
export async function publishConversationChange(input: {
  workspaceId: string;
  summary: ConversationSummary;
  messages: readonly Message[];
  stateChanged: boolean;
}): Promise<void> {
  const summary = summaryOf(input.summary);
  const conversationId = summary.id;
  const publications: Publication[] = input.messages.map((message) => ({
    party: "conversation",
    room: conversationId,
    event: { type: "message.created", conversationId, message },
  }));
  if (input.stateChanged) {
    publications.push({
      party: "conversation",
      room: conversationId,
      event: {
        type: "conversation.updated",
        conversation: conversationOf(summary),
      },
    });
  }
  for (const message of input.messages) {
    if (message.author !== "visitor") continue;
    publications.push({
      party: "workspace",
      room: input.workspaceId,
      event: { type: "visitor.message", summary, message },
    });
  }
  publications.push({
    party: "workspace",
    room: input.workspaceId,
    event: { type: "conversation.upserted", summary },
  });
  await publishInOrder(publications);
}

/** The messages with these ids, in the order of `ids`. */
export function pickMessages(
  messages: readonly Message[],
  ids: readonly string[],
): Message[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  return ids.flatMap((id) => {
    const message = byId.get(id);
    return message ? [message] : [];
  });
}
