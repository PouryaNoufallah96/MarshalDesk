import "server-only";
import {
  addVisitorMessage,
  createVisitor,
  findLatestConversation,
  getWidgetSettings,
  listVisitorMessages,
  markSnippetInstalled,
  recordVisit,
  requestHumanForVisitor,
  type WidgetSettingsRecord,
} from "@marshaldesk/db";
import {
  DEFAULT_GREETING,
  defaultAgentName,
  initialConversationState,
  normalizeDomain,
  type WidgetSession,
  type WidgetStartInput,
  type WidgetThread,
} from "@marshaldesk/shared";
import { ORPCError } from "@orpc/server";
import { profileImageUrl } from "@/lib/storage/public-url";
import { captureVisitorDetails, webUrlOrNull } from "@/lib/visitor/details";
import { isHostAllowed, resolveVisitorToken } from "@/lib/visitor/session";
import {
  createVisitorSecret,
  hashVisitorSecret,
  shouldRefreshVisitorToken,
  signVisitorToken,
} from "@/lib/visitor/token";
import { base, visitorProcedure } from "../procedures";
import { toConversation, toMessages } from "./conversation-mappers";

const THREAD_MESSAGES_LIMIT = 200;

function greetingOf(settings: WidgetSettingsRecord): string {
  return settings.greeting ?? DEFAULT_GREETING;
}

async function loadSettings(
  workspaceId: string,
): Promise<WidgetSettingsRecord> {
  const settings = await getWidgetSettings(workspaceId);
  if (!settings) {
    throw new ORPCError("VISITOR_UNAUTHORIZED", {
      message: "Your chat session has expired.",
    });
  }
  return settings;
}

async function loadThread(
  workspaceId: string,
  visitorId: string,
): Promise<WidgetThread> {
  const [conversation, messages] = await Promise.all([
    findLatestConversation(workspaceId, visitorId),
    listVisitorMessages(workspaceId, visitorId, THREAD_MESSAGES_LIMIT),
  ]);
  return {
    conversation: conversation ? toConversation(conversation) : null,
    messages: toMessages(messages),
  };
}

async function resumeSession(
  input: WidgetStartInput,
  host: string,
): Promise<WidgetSession | null> {
  if (!input.token) return null;
  const session = await resolveVisitorToken(input.token);
  if (!session || session.claims.workspaceId !== input.workspaceId) {
    return null;
  }
  const { claims, visitor } = session;
  const recorded = await recordVisit(input.workspaceId, visitor.id, {
    timezone: input.details.timezone,
    language: input.details.language,
    page: webUrlOrNull(input.details.page),
    referrer: webUrlOrNull(input.details.referrer),
  });
  if (!recorded) return null;

  const token =
    claims.host === host && !shouldRefreshVisitorToken(claims)
      ? input.token
      : await signVisitorToken({
          visitorId: visitor.id,
          workspaceId: input.workspaceId,
          host,
          visitorSecret: claims.visitorSecret,
        });
  return { token, visitorId: visitor.id };
}

export const getConfig = base.widget.getConfig.handler(
  async ({ input, errors }) => {
    const settings = await getWidgetSettings(input.workspaceId);
    if (!settings) {
      throw errors.NOT_FOUND();
    }
    return {
      workspaceId: input.workspaceId,
      agentEnabled: settings.agentEnabled,
      agentName: settings.agentName ?? defaultAgentName(settings.workspaceName),
      agentAvatarUrl: settings.agentAvatarKey
        ? profileImageUrl(settings.agentAvatarKey)
        : null,
      color: settings.color,
      position: settings.position,
      greeting: greetingOf(settings),
      suggestedQuestions: [],
    };
  },
);

// Public: `workspaceId` only picks the widget and the workspace a new visitor
// joins. Existing visitors are resumed from their token alone.
export const start = base.widget.start.handler(
  async ({ context, input, errors }) => {
    const settings = await getWidgetSettings(input.workspaceId);
    if (!settings) {
      throw errors.NOT_FOUND();
    }
    const host = normalizeDomain(input.host);
    if (!isHostAllowed(host, settings.allowedDomains)) {
      throw errors.DOMAIN_NOT_ALLOWED();
    }

    let session = await resumeSession(input, host);
    if (!session) {
      const visitorSecret = createVisitorSecret();
      const visitor = await createVisitor(input.workspaceId, {
        tokenHash: hashVisitorSecret(visitorSecret),
        details: captureVisitorDetails(context.headers, input.details),
      });
      const token = await signVisitorToken({
        visitorId: visitor.id,
        workspaceId: input.workspaceId,
        host,
        visitorSecret,
      });
      session = { token, visitorId: visitor.id };
    }

    if (!settings.snippetInstalledAt) {
      await markSnippetInstalled(input.workspaceId);
    }
    return session;
  },
);

export const getThread = visitorProcedure.widget.getThread.handler(
  ({ context }) => loadThread(context.workspaceId, context.visitor.id),
);

export const sendMessage = visitorProcedure.widget.sendMessage.handler(
  async ({ context, input }) => {
    const settings = await loadSettings(context.workspaceId);
    await addVisitorMessage(context.workspaceId, context.visitor.id, {
      body: input.body,
      newConversation: {
        ...initialConversationState(settings.agentEnabled),
        greeting: greetingOf(settings),
      },
    });
    return loadThread(context.workspaceId, context.visitor.id);
  },
);

export const requestHuman = visitorProcedure.widget.requestHuman.handler(
  async ({ context }) => {
    const settings = await loadSettings(context.workspaceId);
    await requestHumanForVisitor(context.workspaceId, context.visitor.id, {
      greeting: greetingOf(settings),
    });
    return loadThread(context.workspaceId, context.visitor.id);
  },
);
