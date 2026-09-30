import "server-only";
import type {
  ConversationDetailRecord,
  ConversationRecord,
  ConversationSummaryRecord,
  MessageMemberRecord,
  MessageRecord,
  VisitorRecord,
} from "@marshaldesk/db";
import {
  systemEventSchema,
  visitorDetailsSchema,
  type Conversation,
  type ConversationDetail,
  type ConversationSummary,
  type Message,
  type MessageMember,
  type Visitor,
} from "@marshaldesk/shared";
import * as z from "zod";
import { resolveAvatarUrl } from "@/lib/avatar";

const PREVIEW_MAX_LENGTH = 140;
const FORMER_MEMBER_NAME = "Team member";

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

export function toVisitor(record: VisitorRecord): Visitor {
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

export function toConversation(record: ConversationRecord): Conversation {
  return {
    id: record.id,
    state: record.state,
    handoffReason: record.handoffReason,
    createdAt: record.createdAt,
    lastMessageAt: record.lastMessageAt,
    closedAt: record.closedAt,
  };
}

function toMessageMember(member: MessageMemberRecord | null): MessageMember {
  if (!member) {
    const name = FORMER_MEMBER_NAME;
    return {
      id: "",
      name,
      avatarUrl: resolveAvatarUrl({ name, avatarUrl: null }),
    };
  }
  return {
    id: member.id,
    name: member.name,
    avatarUrl: resolveAvatarUrl(member),
  };
}

/** Maps a thread's messages, generating each member's avatar once. */
export function toMessages(records: readonly MessageRecord[]): Message[] {
  const members = new Map<string, MessageMember>();
  const memberFor = (member: MessageMemberRecord | null): MessageMember => {
    const key = member?.id ?? "";
    const cached = members.get(key);
    if (cached) return cached;
    const mapped = toMessageMember(member);
    members.set(key, mapped);
    return mapped;
  };

  return records.map((record): Message => {
    const base = {
      id: record.id,
      conversationId: record.conversationId,
      createdAt: record.createdAt,
    };
    switch (record.author) {
      case "visitor":
        return {
          ...base,
          author: "visitor",
          body: record.body,
          classification: record.classification,
          declined: record.declined,
        };
      case "agent":
        return { ...base, author: "agent", body: record.body };
      case "member":
        return {
          ...base,
          author: "member",
          body: record.body,
          member: memberFor(record.member),
        };
      case "system":
        return {
          ...base,
          author: "system",
          event: systemEventSchema.parse(record.event),
        };
      default: {
        const unhandled: never = record.author;
        throw new Error(`Unhandled message author: ${String(unhandled)}`);
      }
    }
  });
}

function toPreview(body: string | null): string | null {
  if (body === null) return null;
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > PREVIEW_MAX_LENGTH
    ? `${text.slice(0, PREVIEW_MAX_LENGTH - 1).trimEnd()}…`
    : text;
}

export function toConversationSummary(
  record: ConversationSummaryRecord,
): ConversationSummary {
  return {
    ...toConversation(record),
    visitor: toVisitor(record.visitor),
    unread: record.unread,
    preview: toPreview(record.preview),
  };
}

export function toConversationDetail(
  record: ConversationDetailRecord,
): ConversationDetail {
  return {
    ...toConversationSummary(record),
    messages: toMessages(record.messages),
  };
}
