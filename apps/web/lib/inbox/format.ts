import type {
  Conversation,
  ConversationState,
  HandoffReason,
  InboxFilter,
  Message,
  SystemEvent,
  Visitor,
  VisitorDetails,
} from "@/lib/inbox/types";

const LOCALE = "en";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function stateLabel(state: ConversationState): string {
  switch (state) {
    case "ai":
      return "Agent";
    case "waiting":
      return "Waiting";
    case "human":
      return "You";
    case "closed":
      return "Closed";
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}

export function stateDescription(state: ConversationState): string {
  switch (state) {
    case "ai":
      return "The agent is replying";
    case "waiting":
      return "Waiting for you to take over";
    case "human":
      return "You're replying";
    case "closed":
      return "Closed";
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}

export function filterLabel(filter: InboxFilter): string {
  return filter === "open" ? "All open" : stateLabel(filter);
}

export function handoffReasonLabel(reason: HandoffReason): string {
  switch (reason) {
    case "low_confidence":
      return "The agent wasn't sure of the answer";
    case "no_relevant_knowledge":
      return "The knowledge base doesn't cover this";
    case "visitor_requested":
      return "The visitor asked for a person";
    case "agent_off":
      return "The agent is off";
    default: {
      const unhandled: never = reason;
      throw new Error(`Unhandled handoff reason: ${String(unhandled)}`);
    }
  }
}

/** Plain-words text for the centered event line in the conversation. */
export function systemEventLabel(event: SystemEvent): string | null {
  switch (event.kind) {
    case "greeting":
      return null;
    case "handoff":
      return event.reason === "agent_off"
        ? "Waiting for you: the agent is off"
        : `Handed to you: ${lowerFirst(handoffReasonLabel(event.reason))}`;
    case "taken_over":
      return "You took over";
    case "handed_back":
      return "Handed back to the agent";
    case "closed":
      return event.by === "member"
        ? "Conversation closed"
        : "Closed after 24 hours without messages";
    default: {
      const unhandled: never = event;
      throw new Error(`Unhandled event: ${JSON.stringify(unhandled)}`);
    }
  }
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const regionNames = new Intl.DisplayNames([LOCALE], { type: "region" });
const languageNames = new Intl.DisplayNames([LOCALE], { type: "language" });

export function countryName(countryCode: string): string {
  return regionNames.of(countryCode) ?? countryCode;
}

export function languageName(language: string): string {
  return languageNames.of(language) ?? language;
}

export function locationLabel(details: VisitorDetails): string {
  return `${details.city}, ${countryName(details.countryCode)}`;
}

/** Visitors are anonymous, so they're named after where they are. */
export function visitorLabel(visitor: Visitor): string {
  return `Visitor from ${visitor.details.city}`;
}

export function deviceLabel(device: VisitorDetails["device"]): string {
  switch (device) {
    case "desktop":
      return "Desktop";
    case "mobile":
      return "Phone";
    case "tablet":
      return "Tablet";
    default: {
      const unhandled: never = device;
      throw new Error(`Unhandled device: ${String(unhandled)}`);
    }
  }
}

/** A URL without its protocol, for compact display. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function messagePreview(message: Message): string {
  switch (message.author) {
    case "visitor":
      return message.body || attachmentsPreview(message.attachments.length);
    case "agent":
      return stripMarkdown(message.body);
    case "member":
      return `You: ${stripMarkdown(message.body) || attachmentsPreview(message.attachments.length)}`;
    case "system":
      return message.event.kind === "greeting"
        ? message.event.body
        : (systemEventLabel(message.event) ?? "");
    default: {
      const unhandled: never = message;
      throw new Error(`Unhandled message: ${JSON.stringify(unhandled)}`);
    }
  }
}

function attachmentsPreview(count: number): string {
  return count === 1 ? "Sent an image" : `Sent ${count} images`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The message the list previews: the latest one a person or the agent wrote. */
export function lastSpokenMessage(conversation: Conversation): Message | null {
  return (
    conversation.messages.findLast((message) => message.author !== "system") ??
    conversation.messages.at(-1) ??
    null
  );
}

const shortDate = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
});

/** Compact age for list rows: "now", "5m", "3h", "2d", then a date. */
export function compactAge(iso: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(iso));
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;
  return shortDate.format(new Date(iso));
}

const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

export function relativeTime(iso: string, now: number): string {
  const elapsed = Date.parse(iso) - now;
  const abs = Math.abs(elapsed);
  if (abs < MINUTE) return "just now";
  if (abs < HOUR)
    return relativeFormat.format(Math.round(elapsed / MINUTE), "minute");
  if (abs < DAY)
    return relativeFormat.format(Math.round(elapsed / HOUR), "hour");
  if (abs < 30 * DAY)
    return relativeFormat.format(Math.round(elapsed / DAY), "day");
  return relativeFormat.format(Math.round(elapsed / (30 * DAY)), "month");
}

/** Wall-clock time in the viewer's own time zone. Render only after hydration. */
export function clockTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Full date and time in the viewer's own time zone. Render only after hydration. */
export function dateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** The visitor's local time; stable across server and client because the zone is explicit. */
export function visitorLocalTime(timezone: string, now: number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).format(new Date(now));
}
