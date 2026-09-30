import type {
  Conversation,
  HandoffReason,
  Message,
  SystemEvent,
} from "@marshaldesk/shared";
import type { WidgetMessage } from "@/components/widget/types";

function handoffCopy(reason: HandoffReason): string {
  switch (reason) {
    case "agent_off":
      return "You'll be connected to a person shortly. It can take a little while, so please hang on.";
    case "visitor_requested":
    case "low_confidence":
    case "no_relevant_knowledge":
      return "A person will join shortly. Replies will appear here.";
    default: {
      const unhandled: never = reason;
      throw new Error(`Unhandled handoff reason: ${String(unhandled)}`);
    }
  }
}

/** The name of the member who replied next in the same conversation. */
function joiningMemberName(
  messages: readonly Message[],
  index: number,
): string | null {
  const event = messages[index];
  if (!event) return null;
  for (const message of messages.slice(index + 1)) {
    if (message.conversationId !== event.conversationId) return null;
    if (message.author === "member") return message.member.name;
  }
  return null;
}

function systemCopy(
  event: Exclude<SystemEvent, { kind: "greeting" }>,
  memberName: () => string | null,
): string {
  switch (event.kind) {
    case "handoff":
      return handoffCopy(event.reason);
    case "taken_over": {
      const name = memberName();
      return name
        ? `${name} joined the conversation`
        : "A person joined the conversation";
    }
    case "handed_back":
      return "You're now chatting with the AI agent.";
    case "closed":
      return "This conversation has ended. Send a message to start a new one.";
    default: {
      const unhandled: never = event;
      throw new Error(`Unhandled system event: ${JSON.stringify(unhandled)}`);
    }
  }
}

/** Resolves server messages into what the widget shows. */
export function toWidgetMessages(
  messages: readonly Message[],
): WidgetMessage[] {
  return messages.map((message, index): WidgetMessage => {
    switch (message.author) {
      case "visitor":
        return { id: message.id, author: "visitor", body: message.body };
      case "agent":
        return { id: message.id, author: "agent", body: message.body };
      case "member":
        return {
          id: message.id,
          author: "member",
          body: message.body,
          member: {
            name: message.member.name,
            avatarUrl: message.member.avatarUrl,
          },
        };
      case "system": {
        const { event } = message;
        if (event.kind === "greeting") {
          return { id: message.id, author: "agent", body: event.body };
        }
        return {
          id: message.id,
          author: "system",
          body: systemCopy(event, () => joiningMemberName(messages, index)),
        };
      }
      default: {
        const unhandled: never = message;
        throw new Error(`Unhandled message: ${JSON.stringify(unhandled)}`);
      }
    }
  });
}

/** Whether the visitor's next message starts a new conversation. */
export function startsNewConversation(
  conversation: Conversation | null,
): boolean {
  if (!conversation) return true;
  switch (conversation.state) {
    case "closed":
      return true;
    case "ai":
    case "waiting":
    case "human":
      return false;
    default: {
      const unhandled: never = conversation.state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}

/** PRD W-8: offered while the agent is answering or before a conversation. */
export function canRequestHuman(
  agentEnabled: boolean,
  conversation: Conversation | null,
): boolean {
  if (!agentEnabled) return false;
  if (!conversation) return true;
  switch (conversation.state) {
    case "ai":
    case "closed":
      return true;
    case "waiting":
    case "human":
      return false;
    default: {
      const unhandled: never = conversation.state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}
