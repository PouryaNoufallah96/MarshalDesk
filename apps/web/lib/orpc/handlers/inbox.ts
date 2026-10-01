import "server-only";
import {
  getConversation,
  listConversations,
  listReplySources,
  markConversationRead,
  transitionConversation,
  type MessageDraft,
  type TransitionResult,
} from "@marshaldesk/db";
import {
  allowedFromStates,
  inboxErrors,
  nextState,
  type ConversationDetail,
  type ConversationState,
  type MemberAction,
} from "@marshaldesk/shared";
import { ORPCError } from "@orpc/server";
import { ownerProcedure } from "../procedures";
import {
  toConversationDetail,
  toConversationSummary,
} from "./conversation-mappers";
import { publishSavedChange } from "./realtime";

const MAX_REPLY_ATTEMPTS = 3;

function notFound(): ORPCError<"NOT_FOUND", unknown> {
  return new ORPCError("NOT_FOUND", { message: inboxErrors.NOT_FOUND.message });
}

function conflict(
  state: ConversationState,
): ORPCError<"CONFLICT", { state: ConversationState }> {
  return new ORPCError("CONFLICT", {
    message: inboxErrors.CONFLICT.message,
    data: { state },
  });
}

function failure(
  result: Extract<TransitionResult, { ok: false }>,
): ORPCError<string, unknown> {
  return result.state === null ? notFound() : conflict(result.state);
}

async function loadDetail(
  workspaceId: string,
  conversationId: string,
): Promise<ConversationDetail> {
  const record = await getConversation(workspaceId, conversationId);
  if (!record) {
    throw notFound();
  }
  const agentReplyIds = record.messages
    .filter((message) => message.author === "agent")
    .map((message) => message.id);
  const sources = await listReplySources(workspaceId, agentReplyIds);
  return {
    ...toConversationDetail(record),
    agentSources: Object.fromEntries(sources),
  };
}

/** Reloads the saved conversation, publishes the change, and returns it. */
async function loadAndPublish(
  workspaceId: string,
  conversationId: string,
  change: { messageIds: readonly string[]; stateChanged: boolean },
): Promise<ConversationDetail> {
  const detail = await loadDetail(workspaceId, conversationId);
  await publishSavedChange({
    workspaceId,
    conversationId,
    messageIds: change.messageIds,
    stateChanged: change.stateChanged,
    summary: detail,
  });
  return detail;
}

/** The guard and target of a member action whose target doesn't depend on the current state. */
function transitionFor(action: Exclude<MemberAction, "reply">): {
  fromStates: ConversationState[];
  toState: ConversationState;
} {
  const fromStates = allowedFromStates(action);
  const targets = new Set(fromStates.map((state) => nextState(state, action)));
  const [toState] = targets;
  if (targets.size !== 1 || !toState) {
    throw new Error(`Action ${action} has no single target state`);
  }
  return { fromStates, toState };
}

async function applyAction(
  workspaceId: string,
  conversationId: string,
  action: Exclude<MemberAction, "reply">,
  messages: MessageDraft[],
): Promise<ConversationDetail> {
  const result = await transitionConversation(workspaceId, conversationId, {
    ...transitionFor(action),
    messages,
  });
  if (!result.ok) {
    throw failure(result);
  }
  return loadAndPublish(workspaceId, conversationId, {
    messageIds: result.messageIds,
    stateChanged: true,
  });
}

export const list = ownerProcedure.inbox.list.handler(async ({ context }) => {
  const conversations = await listConversations(context.workspaceId);
  return { conversations: conversations.map(toConversationSummary) };
});

export const get = ownerProcedure.inbox.get.handler(({ context, input }) =>
  loadDetail(context.workspaceId, input.id),
);

// Replying takes over: from ai or waiting it's one guarded update that also
// records the takeover; in human it only appends. A concurrent change between
// the two guards is retried against the new state.
export const reply = ownerProcedure.inbox.reply.handler(
  async ({ context, input }) => {
    const member: MessageDraft = {
      author: "member",
      body: input.body,
      memberId: context.member.id,
    };
    const takeOver = transitionFor("take_over");

    for (let attempt = 0; attempt < MAX_REPLY_ATTEMPTS; attempt++) {
      const takenOver = await transitionConversation(
        context.workspaceId,
        input.id,
        {
          ...takeOver,
          messages: [
            { author: "system", event: { kind: "taken_over" } },
            member,
          ],
        },
      );
      if (takenOver.ok) {
        return loadAndPublish(context.workspaceId, input.id, {
          messageIds: takenOver.messageIds,
          stateChanged: true,
        });
      }
      if (takenOver.state === null || !nextState(takenOver.state, "reply")) {
        throw failure(takenOver);
      }

      const appended = await transitionConversation(
        context.workspaceId,
        input.id,
        { fromStates: ["human"], toState: "human", messages: [member] },
      );
      if (appended.ok) {
        return loadAndPublish(context.workspaceId, input.id, {
          messageIds: appended.messageIds,
          stateChanged: false,
        });
      }
      if (appended.state === null || !nextState(appended.state, "reply")) {
        throw failure(appended);
      }
    }
    throw new Error(`Reply to conversation ${input.id} kept conflicting`);
  },
);

export const takeOver = ownerProcedure.inbox.takeOver.handler(
  ({ context, input }) =>
    applyAction(context.workspaceId, input.id, "take_over", [
      { author: "system", event: { kind: "taken_over" } },
    ]),
);

export const handBack = ownerProcedure.inbox.handBack.handler(
  ({ context, input }) =>
    applyAction(context.workspaceId, input.id, "hand_back", [
      { author: "system", event: { kind: "handed_back" } },
    ]),
);

export const close = ownerProcedure.inbox.close.handler(({ context, input }) =>
  applyAction(context.workspaceId, input.id, "close", [
    { author: "system", event: { kind: "closed", by: "member" } },
  ]),
);

export const markRead = ownerProcedure.inbox.markRead.handler(
  async ({ context, input }) => {
    const marked = await markConversationRead(context.workspaceId, input.id);
    if (!marked) {
      throw notFound();
    }
    return loadAndPublish(context.workspaceId, input.id, {
      messageIds: [],
      stateChanged: false,
    });
  },
);
