import "server-only";
import { createWorkspaceWithOwner, getWorkspace } from "@marshaldesk/db";
import { ORPCError } from "@orpc/server";
import { resolveAvatarUrl } from "@/lib/avatar";
import {
  confirmAvatarUpload,
  createAvatarUpload,
  removeAvatar,
} from "./handlers/agent-avatar";
import * as inbox from "./handlers/inbox";
import * as knowledge from "./handlers/knowledge";
import { getToken } from "./handlers/realtime";
import {
  getConfig,
  getRealtimeToken,
  getThread,
  requestHuman,
  sendMessage,
  start,
} from "./handlers/widget";
import { getSettings, updateSettings } from "./handlers/widget-settings";
import { base, ownerProcedure, verifiedProcedure } from "./procedures";

const getCurrentOwner = ownerProcedure.owner.getCurrent.handler(
  async ({ context }) => {
    const workspace = await getWorkspace(context.workspaceId);
    if (!workspace) {
      throw new ORPCError("WORKSPACE_REQUIRED");
    }
    return {
      owner: {
        id: context.user.id,
        name: context.member.name,
        email: context.user.email,
        avatarUrl: resolveAvatarUrl(context.member),
      },
      workspace,
    };
  },
);

const createWorkspace = verifiedProcedure.workspace.create.handler(
  async ({ context, input }) => {
    const { workspace } = await createWorkspaceWithOwner({
      userId: context.user.id,
      workspaceName: input.name,
      ownerName: context.user.name,
      avatarUrl: context.user.image,
    });
    return workspace;
  },
);

export const router = base.router({
  owner: { getCurrent: getCurrentOwner },
  workspace: { create: createWorkspace },
  widgetSettings: {
    get: getSettings,
    update: updateSettings,
    createAvatarUpload,
    confirmAvatarUpload,
    removeAvatar,
  },
  widget: {
    getConfig,
    start,
    getThread,
    sendMessage,
    requestHuman,
    getRealtimeToken,
  },
  inbox: {
    list: inbox.list,
    get: inbox.get,
    reply: inbox.reply,
    takeOver: inbox.takeOver,
    handBack: inbox.handBack,
    close: inbox.close,
    markRead: inbox.markRead,
  },
  knowledge: {
    get: knowledge.get,
    getSource: knowledge.getSource,
    createUpload: knowledge.createUpload,
    createText: knowledge.createText,
    updateText: knowledge.updateText,
    deleteSource: knowledge.deleteSource,
    abandonUpload: knowledge.abandonUpload,
    listChunks: knowledge.listChunks,
  },
  realtime: { getToken },
});

export type Router = typeof router;
