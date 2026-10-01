import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import * as z from "zod";
import {
  conversationDetailSchema,
  conversationStateSchema,
  conversationSummarySchema,
  messageBodySchema,
} from "../schemas/conversation";

export {
  conversationDetailSchema,
  conversationSummarySchema,
  type ConversationDetail,
  type ConversationSummary,
} from "../schemas/conversation";

export const inboxErrors = {
  NOT_FOUND: { message: "This conversation doesn't exist." },
  CONFLICT: {
    message: "This conversation changed. Refresh to see its current state.",
    data: z.object({ state: conversationStateSchema }),
  },
};

const conversationIdInput = z.object({ id: z.string().uuid() });

function conversationAction(path: string, summary: string) {
  return oc
    .meta(
      openapi({
        method: "POST",
        path: `/conversations/{id}/${path}`,
        summary,
        tags: ["Inbox"],
      }),
    )
    .input(conversationIdInput)
    .output(conversationDetailSchema);
}

export function inboxContract<E extends Record<string, object>>(
  ownerErrors: E,
) {
  const errors = { ...ownerErrors, ...inboxErrors };
  return {
    list: oc
      .errors(ownerErrors)
      .meta(
        openapi({
          method: "GET",
          path: "/conversations",
          summary: "List the workspace's conversations",
          tags: ["Inbox"],
        }),
      )
      .output(z.object({ conversations: z.array(conversationSummarySchema) })),
    get: oc
      .errors(errors)
      .meta(
        openapi({
          method: "GET",
          path: "/conversations/{id}",
          summary: "Get a conversation with its messages and visitor details",
          tags: ["Inbox"],
        }),
      )
      .input(conversationIdInput)
      .output(conversationDetailSchema),
    reply: oc
      .errors(errors)
      .meta(
        openapi({
          method: "POST",
          path: "/conversations/{id}/messages",
          summary: "Reply as the owner",
          description:
            "Replying takes over: an ai or waiting conversation becomes human.",
          tags: ["Inbox"],
        }),
      )
      .input(conversationIdInput.extend({ body: messageBodySchema }))
      .output(conversationDetailSchema),
    takeOver: conversationAction(
      "take-over",
      "Take over from the agent",
    ).errors(errors),
    handBack: conversationAction(
      "hand-back",
      "Hand a human conversation back to the agent",
    ).errors(errors),
    close: conversationAction("close", "Close a conversation").errors(errors),
    markRead: conversationAction("read", "Mark a conversation as read").errors(
      errors,
    ),
  };
}
