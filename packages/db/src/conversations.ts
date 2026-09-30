import { and } from "@prisma/orm-postgres/orm-client";
import { Temporal } from "temporal-polyfill";
import { getDb, type Db } from "./client";
import { isUniqueViolation } from "./errors";
import { toVisitorRecord, visitorFields, type VisitorRecord } from "./visitors";

export type ConversationStateValue = "ai" | "waiting" | "human" | "closed";
export type HandoffReasonValue =
  | "low_confidence"
  | "no_relevant_knowledge"
  | "visitor_requested"
  | "agent_off";
export type MessageAuthorValue = "visitor" | "agent" | "member" | "system";
export type MessageClassificationValue =
  "support_question" | "small_talk" | "off_topic";

export type SystemEventValue =
  | { kind: "greeting"; body: string }
  | { kind: "handoff"; reason: HandoffReasonValue }
  | { kind: "taken_over" }
  | { kind: "handed_back" }
  | { kind: "closed"; by: "member" | "inactivity" };

export const OPEN_STATES = [
  "ai",
  "waiting",
  "human",
] as const satisfies readonly ConversationStateValue[];

// Prisma suffixes index names with a hash; this is the name Postgres reports.
const OPEN_CONVERSATION_INDEX = "conversations_one_open_per_visitor_a2ec6ddc";
const MAX_CREATE_ATTEMPTS = 3;

export type ConversationRecord = {
  id: string;
  visitorId: string;
  state: ConversationStateValue;
  handoffReason: HandoffReasonValue | null;
  createdAt: string;
  lastMessageAt: string;
  lastVisitorMessageAt: string | null;
  ownerReadAt: string | null;
  closedAt: string | null;
};

export type MessageMemberRecord = {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarKey: string | null;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  author: MessageAuthorValue;
  body: string;
  /** Raw jsonb for system messages; parse it with `systemEventSchema`. */
  event: unknown;
  classification: MessageClassificationValue | null;
  declined: boolean;
  createdAt: string;
  member: MessageMemberRecord | null;
};

export type ConversationSummaryRecord = ConversationRecord & {
  visitor: VisitorRecord;
  unread: boolean;
  preview: string | null;
};

export type ConversationDetailRecord = ConversationSummaryRecord & {
  messages: MessageRecord[];
};

export type MessageDraft =
  | { author: "visitor"; body: string }
  | { author: "member"; body: string; memberId: string }
  | { author: "system"; event: SystemEventValue };

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Instant = Temporal.Instant;

const conversationFields = [
  "id",
  "visitorId",
  "state",
  "handoffReason",
  "createdAt",
  "lastMessageAt",
  "lastVisitorMessageAt",
  "ownerReadAt",
  "closedAt",
] as const;

const messageFields = [
  "id",
  "conversationId",
  "author",
  "body",
  "event",
  "classification",
  "declined",
  "createdAt",
] as const;

type ConversationRow = {
  id: string;
  visitorId: string;
  state: ConversationStateValue;
  handoffReason: HandoffReasonValue | null;
  createdAt: Instant;
  lastMessageAt: Instant;
  lastVisitorMessageAt: Instant | null;
  ownerReadAt: Instant | null;
  closedAt: Instant | null;
};

type MessageRow = {
  id: string;
  conversationId: string;
  author: MessageAuthorValue;
  body: string;
  event: unknown;
  classification: MessageClassificationValue | null;
  declined: boolean;
  createdAt: Instant;
  member: MessageMemberRecord | null;
};

function toConversationRecord(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    visitorId: row.visitorId,
    state: row.state,
    handoffReason: row.handoffReason,
    createdAt: row.createdAt.toString(),
    lastMessageAt: row.lastMessageAt.toString(),
    lastVisitorMessageAt: row.lastVisitorMessageAt?.toString() ?? null,
    ownerReadAt: row.ownerReadAt?.toString() ?? null,
    closedAt: row.closedAt?.toString() ?? null,
  };
}

function toMessageRecord(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    author: row.author,
    body: row.body,
    event: row.event,
    classification: row.classification,
    declined: row.declined,
    createdAt: row.createdAt.toString(),
    member: row.member
      ? {
          id: row.member.id,
          name: row.member.name,
          avatarUrl: row.member.avatarUrl,
          avatarKey: row.member.avatarKey,
        }
      : null,
  };
}

function isUnread(row: ConversationRow): boolean {
  if (!row.lastVisitorMessageAt) return false;
  if (!row.ownerReadAt) return true;
  return (
    Temporal.Instant.compare(row.lastVisitorMessageAt, row.ownerReadAt) > 0
  );
}

// Messages written in one transaction would share Postgres `now()`, so each
// gets an explicit, strictly increasing timestamp from `clock_timestamp()`.
async function insertMessages(
  tx: Tx,
  workspaceId: string,
  conversationId: string,
  drafts: readonly MessageDraft[],
  at: Instant,
): Promise<string[]> {
  const ids: string[] = [];
  for (const [index, draft] of drafts.entries()) {
    const createdAt = at.add({ microseconds: index });
    let created: { id: string };
    switch (draft.author) {
      case "visitor":
        created = await tx.orm.public.Message.select("id").create({
          conversationId,
          workspaceId,
          author: "visitor",
          body: draft.body,
          createdAt,
        });
        break;
      case "member":
        created = await tx.orm.public.Message.select("id").create({
          conversationId,
          workspaceId,
          author: "member",
          memberId: draft.memberId,
          body: draft.body,
          createdAt,
        });
        break;
      case "system":
        created = await tx.orm.public.Message.select("id").create({
          conversationId,
          workspaceId,
          author: "system",
          event: draft.event,
          createdAt,
        });
        break;
      default: {
        const unhandled: never = draft;
        throw new Error(`Unhandled message draft: ${String(unhandled)}`);
      }
    }
    ids.push(created.id);
  }
  return ids;
}

function lastDraftAt(drafts: readonly MessageDraft[], at: Instant): Instant {
  return at.add({ microseconds: Math.max(drafts.length - 1, 0) });
}

function lastVisitorDraftAt(
  drafts: readonly MessageDraft[],
  at: Instant,
): Instant | null {
  let last: Instant | null = null;
  for (const [index, draft] of drafts.entries()) {
    if (draft.author === "visitor") last = at.add({ microseconds: index });
  }
  return last;
}

// ---------------------------------------------------------------------------
// Visitor side

export async function findOpenConversation(
  workspaceId: string,
  visitorId: string,
): Promise<ConversationRecord | null> {
  const row = await getDb()
    .orm.public.Conversation.select(...conversationFields)
    .where((c) =>
      and(
        c.workspaceId.eq(workspaceId),
        c.visitorId.eq(visitorId),
        c.state.in([...OPEN_STATES]),
      ),
    )
    .first();
  return row ? toConversationRecord(row) : null;
}

export async function findLatestConversation(
  workspaceId: string,
  visitorId: string,
): Promise<ConversationRecord | null> {
  const row = await getDb()
    .orm.public.Conversation.select(...conversationFields)
    .where({ workspaceId, visitorId })
    .orderBy([(c) => c.createdAt.desc(), (c) => c.id.desc()])
    .first();
  return row ? toConversationRecord(row) : null;
}

/** The latest `limit` messages across all of a visitor's conversations, oldest first. */
export async function listVisitorMessages(
  workspaceId: string,
  visitorId: string,
  limit: number,
): Promise<MessageRecord[]> {
  const db = getDb();
  const conversations = await db.orm.public.Conversation.select("id")
    .where({ workspaceId, visitorId })
    .all();
  if (conversations.length === 0) return [];
  const rows = await db.orm.public.Message.select(...messageFields)
    .include("member", (member) =>
      member.select("id", "name", "avatarUrl", "avatarKey"),
    )
    .where((m) =>
      and(
        m.workspaceId.eq(workspaceId),
        m.conversationId.in(conversations.map((c) => c.id)),
      ),
    )
    .orderBy([(m) => m.createdAt.desc(), (m) => m.id.desc()])
    .limit(limit)
    .all();
  return rows.map(toMessageRecord).reverse();
}

type ConversationUpdate = {
  state?: ConversationStateValue;
  handoffReason?: HandoffReasonValue;
};

// One plain UPDATE, so Postgres re-checks the state guard against the latest
// committed row when a concurrent transition wins the row lock first. Unset
// fields are passed as '' and keep their value. Returns the database clock
// read after the lock is held, so messages order by when they were applied.
async function guardedUpdate(
  tx: Tx,
  workspaceId: string,
  conversationId: string,
  fromStates: readonly ConversationStateValue[],
  set: ConversationUpdate,
): Promise<Instant | null> {
  const plan = getDb().raw.sql`
    UPDATE conversations
    SET state = COALESCE(NULLIF(${set.state ?? ""}, ''), state),
        handoff_reason = COALESCE(NULLIF(${set.handoffReason ?? ""}, ''), handoff_reason),
        closed_at = CASE WHEN ${set.state ?? ""} = 'closed' THEN clock_timestamp() ELSE closed_at END
    WHERE id = ${conversationId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND state = ANY(string_to_array(${fromStates.join(",")}, ','))
    RETURNING clock_timestamp() AS at`
    .returnsRow({ at: "pg/timestamptz-temporal@1" })
    .build();
  const [row] = await tx.query(plan);
  return row ? Temporal.Instant.from(row.at.toString()) : null;
}

async function databaseNow(tx: Tx): Promise<Instant> {
  const plan = getDb().raw.sql`SELECT clock_timestamp() AS at`
    .returnsRow({
      at: "pg/timestamptz-temporal@1",
    })
    .build();
  const [row] = await tx.query(plan);
  if (!row) throw new Error("clock_timestamp() returned no row");
  return Temporal.Instant.from(row.at.toString());
}

async function touchConversation(
  tx: Tx,
  workspaceId: string,
  conversationId: string,
  drafts: readonly MessageDraft[],
  at: Instant,
): Promise<void> {
  if (drafts.length === 0) return;
  const lastVisitorAt = lastVisitorDraftAt(drafts, at);
  await tx.orm.public.Conversation.select("id")
    .where({ id: conversationId, workspaceId })
    .update({
      lastMessageAt: lastDraftAt(drafts, at),
      ...(lastVisitorAt ? { lastVisitorMessageAt: lastVisitorAt } : {}),
    });
}

/**
 * A guarded update and its messages in one transaction; nothing is written when
 * the guard fails (`null`). Returns the inserted message ids in order.
 */
async function guardedTransition(
  workspaceId: string,
  conversationId: string,
  input: {
    fromStates: readonly ConversationStateValue[];
    set: ConversationUpdate;
    messages: readonly MessageDraft[];
  },
): Promise<string[] | null> {
  return getDb().transaction(async (tx) => {
    const at = await guardedUpdate(
      tx,
      workspaceId,
      conversationId,
      input.fromStates,
      input.set,
    );
    if (!at) return null;
    const messageIds = await insertMessages(
      tx,
      workspaceId,
      conversationId,
      input.messages,
      at,
    );
    await touchConversation(
      tx,
      workspaceId,
      conversationId,
      input.messages,
      at,
    );
    return messageIds;
  });
}

/** Appends to the visitor's open conversation. `null` when there's none (any more). */
async function appendToOpenConversation(
  workspaceId: string,
  visitorId: string,
  drafts: readonly MessageDraft[],
): Promise<{ conversationId: string; messageIds: string[] } | null> {
  const open = await findOpenConversation(workspaceId, visitorId);
  if (!open) return null;
  const messageIds = await guardedTransition(workspaceId, open.id, {
    fromStates: OPEN_STATES,
    set: {},
    messages: drafts,
  });
  return messageIds ? { conversationId: open.id, messageIds } : null;
}

async function createConversation(
  workspaceId: string,
  visitorId: string,
  input: {
    state: ConversationStateValue;
    handoffReason: HandoffReasonValue | null;
    messages: readonly MessageDraft[];
  },
): Promise<{ conversationId: string; messageIds: string[] }> {
  return getDb().transaction(async (tx) => {
    const at = await databaseNow(tx);
    const conversation = await tx.orm.public.Conversation.select("id").create({
      workspaceId,
      visitorId,
      state: input.state,
      handoffReason: input.handoffReason,
      createdAt: at,
      lastMessageAt: lastDraftAt(input.messages, at),
      lastVisitorMessageAt: lastVisitorDraftAt(input.messages, at),
    });
    const messageIds = await insertMessages(
      tx,
      workspaceId,
      conversation.id,
      input.messages,
      at,
    );
    return { conversationId: conversation.id, messageIds };
  });
}

/**
 * Runs `attempt`, and when the visitor has no open conversation, creates one.
 * A concurrent request may create it first; the loser then retries against the winner.
 */
async function withOpenConversation<T>(
  attempt: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  for (let i = 0; i < MAX_CREATE_ATTEMPTS; i++) {
    const existing = await attempt();
    if (existing !== null) return existing;
    try {
      return await create();
    } catch (error) {
      if (!isUniqueViolation(error, OPEN_CONVERSATION_INDEX)) throw error;
    }
  }
  throw new Error("Couldn't find or create the visitor's open conversation");
}

export type NewConversation = {
  state: ConversationStateValue;
  handoffReason: HandoffReasonValue | null;
  greeting: string;
};

export type VisitorWrite = {
  conversationId: string;
  /** Whether this write created the conversation or changed its state. */
  changed: boolean;
  /** The messages this write inserted, in order. */
  messageIds: string[];
};

/**
 * Appends a visitor message to their open conversation, or starts a new one:
 * greeting, the message, then the handoff notice when it starts `waiting`.
 */
export async function addVisitorMessage(
  workspaceId: string,
  visitorId: string,
  input: { body: string; newConversation: NewConversation },
): Promise<VisitorWrite> {
  const message: MessageDraft = { author: "visitor", body: input.body };
  const { state, handoffReason, greeting } = input.newConversation;
  return withOpenConversation<VisitorWrite>(
    async () => {
      const appended = await appendToOpenConversation(workspaceId, visitorId, [
        message,
      ]);
      return appended ? { ...appended, changed: false } : null;
    },
    async () => {
      const messages: MessageDraft[] = [
        { author: "system", event: { kind: "greeting", body: greeting } },
        message,
      ];
      if (state === "waiting" && handoffReason) {
        messages.push({
          author: "system",
          event: { kind: "handoff", reason: handoffReason },
        });
      }
      const created = await createConversation(workspaceId, visitorId, {
        state,
        handoffReason,
        messages,
      });
      return { ...created, changed: true };
    },
  );
}

/**
 * The visitor asks for a person: `ai` becomes `waiting` (visitor_requested).
 * Already waiting or human is a no-op; with no open conversation, one starts waiting.
 */
export async function requestHumanForVisitor(
  workspaceId: string,
  visitorId: string,
  input: { greeting: string },
): Promise<VisitorWrite> {
  const handoff: MessageDraft = {
    author: "system",
    event: { kind: "handoff", reason: "visitor_requested" },
  };
  return withOpenConversation<VisitorWrite>(
    // A failed guard falls through to creating, which either succeeds (the
    // conversation just closed) or hits the open-conversation index and retries.
    async () => {
      const open = await findOpenConversation(workspaceId, visitorId);
      if (!open) return null;
      if (open.state !== "ai")
        return { conversationId: open.id, changed: false, messageIds: [] };
      const messageIds = await guardedTransition(workspaceId, open.id, {
        fromStates: ["ai"],
        set: { state: "waiting", handoffReason: "visitor_requested" },
        messages: [handoff],
      });
      return messageIds
        ? { conversationId: open.id, changed: true, messageIds }
        : null;
    },
    async () => {
      const created = await createConversation(workspaceId, visitorId, {
        state: "waiting",
        handoffReason: "visitor_requested",
        messages: [
          {
            author: "system",
            event: { kind: "greeting", body: input.greeting },
          },
          handoff,
        ],
      });
      return { ...created, changed: true };
    },
  );
}

// ---------------------------------------------------------------------------
// Owner side

const LIST_LIMIT = 200;
const CONVERSATION_MESSAGES_LIMIT = 1000;
const PREVIEW_AUTHORS: MessageAuthorValue[] = ["visitor", "agent", "member"];

function conversationsWithSummary(workspaceId: string) {
  return getDb()
    .orm.public.Conversation.select(...conversationFields)
    .include("visitor", (visitor) => visitor.select(...visitorFields))
    .include("messages", (messages) =>
      messages
        .select("body")
        .where((m) => m.author.in(PREVIEW_AUTHORS))
        .orderBy([(m) => m.createdAt.desc(), (m) => m.id.desc()])
        .limit(1),
    )
    .where({ workspaceId });
}

type SummaryRow = ConversationRow & {
  visitor: Parameters<typeof toVisitorRecord>[0] | null;
  messages: readonly { body: string }[];
};

function toSummaryRecord(row: SummaryRow): ConversationSummaryRecord {
  if (!row.visitor) throw new Error(`Conversation ${row.id} has no visitor`);
  return {
    ...toConversationRecord(row),
    visitor: toVisitorRecord(row.visitor),
    unread: isUnread(row),
    preview: row.messages[0]?.body ?? null,
  };
}

export async function listConversations(
  workspaceId: string,
): Promise<ConversationSummaryRecord[]> {
  const rows = await conversationsWithSummary(workspaceId)
    .orderBy([(c) => c.lastMessageAt.desc(), (c) => c.id.desc()])
    .limit(LIST_LIMIT)
    .all();
  return rows.map(toSummaryRecord);
}

export async function getConversationSummary(
  workspaceId: string,
  conversationId: string,
): Promise<ConversationSummaryRecord | null> {
  const row = await conversationsWithSummary(workspaceId)
    .where({ id: conversationId })
    .first();
  return row ? toSummaryRecord(row) : null;
}

export async function hasConversation(
  workspaceId: string,
  conversationId: string,
): Promise<boolean> {
  const row = await getDb()
    .orm.public.Conversation.select("id")
    .where({ id: conversationId, workspaceId })
    .first();
  return row !== null;
}

export async function getConversation(
  workspaceId: string,
  conversationId: string,
): Promise<ConversationDetailRecord | null> {
  const row = await conversationsWithSummary(workspaceId)
    .where({ id: conversationId })
    .first();
  if (!row) return null;
  const messages = await getDb()
    .orm.public.Message.select(...messageFields)
    .include("member", (member) =>
      member.select("id", "name", "avatarUrl", "avatarKey"),
    )
    .where({ workspaceId, conversationId })
    .orderBy([(m) => m.createdAt.asc(), (m) => m.id.asc()])
    .limit(CONVERSATION_MESSAGES_LIMIT)
    .all();
  return { ...toSummaryRecord(row), messages: messages.map(toMessageRecord) };
}

export type TransitionResult =
  /** `messageIds` are the inserted messages, in order. */
  | { ok: true; messageIds: string[] }
  /** `state` is `null` when the conversation isn't in this workspace. */
  | { ok: false; state: ConversationStateValue | null };

/**
 * One guarded update (`WHERE state IN fromStates`) plus its messages, in one
 * transaction. When the guard fails nothing is written.
 */
export async function transitionConversation(
  workspaceId: string,
  conversationId: string,
  input: {
    fromStates: readonly ConversationStateValue[];
    toState: ConversationStateValue;
    /** Required when moving to `waiting`. */
    handoffReason?: HandoffReasonValue;
    messages: readonly MessageDraft[];
  },
): Promise<TransitionResult> {
  if (input.toState === "waiting" && !input.handoffReason) {
    throw new Error("Moving to waiting needs a handoff reason");
  }
  const messageIds = await guardedTransition(workspaceId, conversationId, {
    fromStates: input.fromStates,
    set: {
      state: input.toState,
      ...(input.handoffReason ? { handoffReason: input.handoffReason } : {}),
    },
    messages: input.messages,
  });
  if (messageIds) return { ok: true, messageIds };
  const current = await getDb()
    .orm.public.Conversation.select("state")
    .where({ id: conversationId, workspaceId })
    .first();
  return { ok: false, state: current?.state ?? null };
}

export async function markConversationRead(
  workspaceId: string,
  conversationId: string,
): Promise<boolean> {
  const db = getDb();
  const plan = db.raw.sql`
    UPDATE conversations
    SET owner_read_at = clock_timestamp()
    WHERE id = ${conversationId}::uuid AND workspace_id = ${workspaceId}::uuid
    RETURNING id`
    .returnsRow({ id: "pg/uuid@1" })
    .build();
  const rows = await db.runtime().query(plan);
  return rows.length > 0;
}
