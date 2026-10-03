import * as z from "zod";
import {
  visitorDetailsSchema,
  type Conversation,
  type ConversationState,
  type ConversationSummary,
  type HandoffReason,
  type Visitor,
} from "./schemas/conversation";

// Stored rows as the data layer returns them. Declared structurally so the web
// app and the Neon Function map them the same way without sharing the client.

export type StoredConversation = {
  id: string;
  state: ConversationState;
  handoffReason: HandoffReason | null;
  createdAt: string;
  lastMessageAt: string;
  closedAt: string | null;
  updatedAt: string;
};

export type StoredVisitor = {
  id: string;
  /** Raw jsonb. */
  details: unknown;
  visitCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type StoredConversationSummary = StoredConversation & {
  visitor: StoredVisitor;
  unread: boolean;
  preview: string | null;
};

const PREVIEW_MAX_LENGTH = 140;

const { shape } = visitorDetailsSchema;

// Stored details come from older writes too, so anything missing reads as null.
const storedDetailsSchema = z
  .object({
    countryCode: shape.countryCode.catch(null),
    city: shape.city.catch(null),
    timezone: shape.timezone.catch(null),
    language: shape.language.catch(null),
    device: shape.device.catch("desktop"),
    browser: shape.browser.catch(null),
    os: shape.os.catch(null),
    page: shape.page.catch(null),
    referrer: shape.referrer.catch(null),
  })
  .catch({
    countryCode: null,
    city: null,
    timezone: null,
    language: null,
    device: "desktop",
    browser: null,
    os: null,
    page: null,
    referrer: null,
  });

export function toVisitor(record: StoredVisitor): Visitor {
  return {
    id: record.id,
    details: {
      ...storedDetailsSchema.parse(record.details),
      visitCount: record.visitCount,
    },
    firstSeenAt: record.firstSeenAt,
    lastSeenAt: record.lastSeenAt,
  };
}

export function toConversation(record: StoredConversation): Conversation {
  return {
    id: record.id,
    state: record.state,
    handoffReason: record.handoffReason,
    createdAt: record.createdAt,
    lastMessageAt: record.lastMessageAt,
    closedAt: record.closedAt,
    updatedAt: record.updatedAt,
  };
}

function toPreview(body: string | null): string | null {
  if (body === null) return null;
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > PREVIEW_MAX_LENGTH
    ? `${text.slice(0, PREVIEW_MAX_LENGTH - 1).trimEnd()}…`
    : text;
}

export function toConversationSummary(
  record: StoredConversationSummary,
): ConversationSummary {
  return {
    ...toConversation(record),
    visitor: toVisitor(record.visitor),
    unread: record.unread,
    preview: toPreview(record.preview),
  };
}
