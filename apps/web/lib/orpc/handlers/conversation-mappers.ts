import "server-only";
import type {
  ConversationDetailRecord,
  MessageMemberRecord,
  MessageRecord,
} from "@marshaldesk/db";
import {
  systemEventSchema,
  toConversationSummary,
  type ConversationDetail,
  type Message,
  type MessageMember,
} from "@marshaldesk/shared";
import { resolveAvatarUrl } from "@/lib/avatar";

export {
  toConversation,
  toConversationSummary,
  toVisitor,
} from "@marshaldesk/shared";

const FORMER_MEMBER_NAME = "Team member";

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

export function toConversationDetail(
  record: ConversationDetailRecord,
): ConversationDetail {
  return {
    ...toConversationSummary(record),
    messages: toMessages(record.messages),
  };
}
