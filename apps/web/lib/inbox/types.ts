export const CONVERSATION_STATES = [
  "ai",
  "waiting",
  "human",
  "closed",
] as const;
export type ConversationState = (typeof CONVERSATION_STATES)[number];

export const HANDOFF_REASONS = [
  "low_confidence",
  "no_relevant_knowledge",
  "visitor_requested",
  "agent_off",
] as const;
export type HandoffReason = (typeof HANDOFF_REASONS)[number];

export type MessageClassification =
  "support_question" | "small_talk" | "off_topic";

export type VisitorDetails = {
  /** ISO 3166-1 alpha-2 code, looked up from the IP address. */
  countryCode: string;
  city: string;
  /** IANA time zone, e.g. `Europe/Berlin`. */
  timezone: string;
  /** BCP 47 browser language, e.g. `de-DE`. */
  language: string;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  page: string;
  referrer: string | null;
  visitCount: number;
};

export type Visitor = {
  id: string;
  details: VisitorDetails;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type Attachment = {
  storageKey: string;
  name: string;
  mime: string;
  size: number;
};

export type SystemEvent =
  | { kind: "greeting"; body: string }
  | { kind: "handoff"; reason: HandoffReason }
  | { kind: "taken_over" }
  | { kind: "handed_back" }
  | { kind: "closed"; by: "member" | "inactivity" };

type MessageBase = {
  id: string;
  createdAt: string;
};

export type VisitorMessage = MessageBase & {
  author: "visitor";
  body: string;
  attachments: Attachment[];
  classification: MessageClassification;
  declined: boolean;
};

export type AgentMessage = MessageBase & {
  author: "agent";
  body: string;
};

export type MemberMessage = MessageBase & {
  author: "member";
  memberId: string;
  body: string;
  attachments: Attachment[];
};

export type SystemMessage = MessageBase & {
  author: "system";
  event: SystemEvent;
};

export type Message =
  VisitorMessage | AgentMessage | MemberMessage | SystemMessage;

export type Conversation = {
  id: string;
  visitor: Visitor;
  state: ConversationState;
  /** The reason recorded on the most recent move to `waiting`. */
  handoffReason: HandoffReason | null;
  createdAt: string;
  lastMessageAt: string;
  closedAt: string | null;
  unread: boolean;
  messages: Message[];
};

/** The list filter: every open conversation, or one state. */
export type InboxFilter = "open" | ConversationState;
