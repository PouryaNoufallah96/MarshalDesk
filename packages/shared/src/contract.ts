import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { inboxContract } from "./contracts/inbox";
import { widgetContract } from "./contracts/widget";
import { realtimeTokenSchema } from "./realtime";
import * as z from "zod";
import {
  avatarUploadSchema,
  confirmAvatarUploadSchema,
  createAvatarUploadSchema,
  savedWidgetSettingsSchema,
  widgetSettingsSchema,
} from "./schemas/widget";
import {
  createWorkspaceSchema,
  currentOwnerSchema,
  workspaceSchema,
} from "./schemas/workspace";

export const ERROR_STATUS = {
  UNAUTHORIZED: 401,
  EMAIL_NOT_VERIFIED: 403,
  WORKSPACE_REQUIRED: 403,
  AVATAR_REJECTED: 422,
  VISITOR_UNAUTHORIZED: 401,
  DOMAIN_NOT_ALLOWED: 403,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

const signedInErrors = {
  UNAUTHORIZED: { message: "Sign in to continue." },
  EMAIL_NOT_VERIFIED: { message: "Verify your email to continue." },
};

const ownerErrors = {
  ...signedInErrors,
  WORKSPACE_REQUIRED: { message: "Name your business to continue." },
};

const avatarErrors = {
  ...ownerErrors,
  AVATAR_REJECTED: { message: "That image couldn't be used." },
};

export const contract = {
  owner: {
    getCurrent: oc
      .errors(ownerErrors)
      .meta(
        openapi({
          method: "GET",
          path: "/owner",
          summary: "Get the signed-in owner and their workspace",
          tags: ["Owner"],
        }),
      )
      .output(currentOwnerSchema),
  },
  workspace: {
    create: oc
      .errors(signedInErrors)
      .meta(
        openapi({
          method: "POST",
          path: "/workspace",
          summary: "Create the owner's workspace from their business name",
          description:
            "Idempotent: an owner has exactly one workspace, so calling it again returns the existing one.",
          tags: ["Workspace"],
        }),
      )
      .input(createWorkspaceSchema)
      .output(workspaceSchema),
  },
  widgetSettings: {
    get: oc
      .errors(ownerErrors)
      .meta(
        openapi({
          method: "GET",
          path: "/widget-settings",
          summary: "Get the workspace's widget settings",
          tags: ["Widget settings"],
        }),
      )
      .output(savedWidgetSettingsSchema),
    update: oc
      .errors(ownerErrors)
      .meta(
        openapi({
          method: "PUT",
          path: "/widget-settings",
          summary: "Replace the workspace's widget settings",
          description:
            "Takes the full settings snapshot, so the latest write always wins.",
          tags: ["Widget settings"],
        }),
      )
      .input(widgetSettingsSchema)
      .output(savedWidgetSettingsSchema),
    createAvatarUpload: oc
      .errors(avatarErrors)
      .meta(
        openapi({
          method: "POST",
          path: "/widget-settings/avatar/uploads",
          summary: "Get a presigned URL for uploading a new agent avatar",
          tags: ["Widget settings"],
        }),
      )
      .input(createAvatarUploadSchema)
      .output(avatarUploadSchema),
    confirmAvatarUpload: oc
      .errors(avatarErrors)
      .meta(
        openapi({
          method: "POST",
          path: "/widget-settings/avatar",
          summary: "Use an uploaded image as the agent avatar",
          description:
            "Checks the stored object's size and type, then replaces the previous avatar.",
          tags: ["Widget settings"],
        }),
      )
      .input(confirmAvatarUploadSchema)
      .output(savedWidgetSettingsSchema),
    removeAvatar: oc
      .errors(ownerErrors)
      .meta(
        openapi({
          method: "DELETE",
          path: "/widget-settings/avatar",
          summary: "Remove the agent avatar and go back to the generated one",
          tags: ["Widget settings"],
        }),
      )
      .output(savedWidgetSettingsSchema),
  },
  widget: widgetContract,
  inbox: inboxContract(ownerErrors),
  realtime: {
    getToken: oc
      .errors({
        ...ownerErrors,
        NOT_FOUND: { message: "This conversation doesn't exist." },
      })
      .meta(
        openapi({
          method: "POST",
          path: "/realtime/token",
          summary: "Get a short-lived token to open a real-time socket",
          description:
            "Without a conversation id the token opens the workspace room; with one, that conversation's room once it's confirmed to belong to the workspace.",
          tags: ["Realtime"],
        }),
      )
      .input(z.object({ conversationId: z.string().uuid().optional() }))
      .output(realtimeTokenSchema),
  },
};

export type Contract = typeof contract;
