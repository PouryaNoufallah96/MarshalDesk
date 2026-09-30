import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import * as z from "zod";
import {
  conversationSchema,
  messageBodySchema,
  messageSchema,
} from "../schemas/conversation";
import { WIDGET_COLORS, WIDGET_POSITIONS } from "../schemas/widget";

export const VISITOR_TOKEN_STORAGE_PREFIX = "marshaldesk:visitor:";

const visitorErrors = {
  VISITOR_UNAUTHORIZED: { message: "Your chat session has expired." },
  DOMAIN_NOT_ALLOWED: { message: "The widget isn't allowed on this website." },
};

export const publicWidgetConfigSchema = z.object({
  workspaceId: z.string(),
  agentEnabled: z.boolean(),
  agentName: z.string(),
  agentAvatarUrl: z.string().nullable(),
  color: z.enum(WIDGET_COLORS),
  position: z.enum(WIDGET_POSITIONS),
  greeting: z.string(),
  suggestedQuestions: z.array(z.string()),
});
export type PublicWidgetConfig = z.infer<typeof publicWidgetConfigSchema>;

export const widgetStartInputSchema = z.object({
  workspaceId: z.string().uuid(),
  /** The embedding page's hostname, as reported by the embed script. */
  host: z.string().min(1).max(253),
  /** The token saved in the iframe's storage from an earlier visit. */
  token: z.string().max(4096).nullable(),
  details: z.object({
    timezone: z.string().max(100).nullable(),
    language: z.string().max(35).nullable(),
    page: z.string().max(2048).nullable(),
    referrer: z.string().max(2048).nullable(),
  }),
});
export type WidgetStartInput = z.infer<typeof widgetStartInputSchema>;

export const widgetSessionSchema = z.object({
  token: z.string(),
  visitorId: z.string(),
});
export type WidgetSession = z.infer<typeof widgetSessionSchema>;

export const widgetThreadSchema = z.object({
  /** The visitor's latest conversation, open or closed. */
  conversation: conversationSchema.nullable(),
  /** Messages across the visitor's conversations, oldest first. */
  messages: z.array(messageSchema),
});
export type WidgetThread = z.infer<typeof widgetThreadSchema>;

export const widgetContract = {
  getConfig: oc
    .errors({ NOT_FOUND: { message: "This widget doesn't exist." } })
    .meta(
      openapi({
        method: "GET",
        path: "/widget/{workspaceId}/config",
        summary: "Get the public widget settings for a workspace",
        tags: ["Widget"],
      }),
    )
    .input(z.object({ workspaceId: z.string().uuid() }))
    .output(publicWidgetConfigSchema),
  start: oc
    .errors({
      NOT_FOUND: { message: "This widget doesn't exist." },
      DOMAIN_NOT_ALLOWED: visitorErrors.DOMAIN_NOT_ALLOWED,
    })
    .meta(
      openapi({
        method: "POST",
        path: "/widget/{workspaceId}/sessions",
        summary: "Start or resume a visitor session",
        description:
          "Checks the host against the workspace's allowed domains. Returns the saved visitor's refreshed token when the given one is still valid, otherwise a new visitor.",
        tags: ["Widget"],
      }),
    )
    .input(widgetStartInputSchema)
    .output(widgetSessionSchema),
  getThread: oc
    .errors(visitorErrors)
    .meta(
      openapi({
        method: "GET",
        path: "/widget/thread",
        summary: "Get the visitor's conversation and messages",
        tags: ["Widget"],
      }),
    )
    .output(widgetThreadSchema),
  sendMessage: oc
    .errors(visitorErrors)
    .meta(
      openapi({
        method: "POST",
        path: "/widget/messages",
        summary: "Send a visitor message",
        description:
          "Starts a new conversation, with the greeting as its first message, when the visitor has no open one.",
        tags: ["Widget"],
      }),
    )
    .input(z.object({ body: messageBodySchema }))
    .output(widgetThreadSchema),
  requestHuman: oc
    .errors(visitorErrors)
    .meta(
      openapi({
        method: "POST",
        path: "/widget/handoff",
        summary: "Ask for a real person",
        description:
          "Moves the visitor's conversation from the agent to waiting, with the reason visitor_requested.",
        tags: ["Widget"],
      }),
    )
    .output(widgetThreadSchema),
};
