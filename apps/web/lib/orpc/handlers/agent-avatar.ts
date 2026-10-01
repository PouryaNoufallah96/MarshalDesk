import "server-only";
import { replaceAgentAvatarKey } from "@marshaldesk/db";
import { AGENT_AVATAR_MAX_BYTES } from "@marshaldesk/shared";
import { ORPCError } from "@orpc/server";
import {
  deleteProfileImage,
  deleteProfileImageQuietly,
  headProfileImage,
  isAgentAvatarKey,
  isAgentAvatarMimeType,
  presignAgentAvatarUpload,
} from "@/lib/storage/agent-avatar";
import { ownerProcedure } from "../procedures";
import { loadSavedWidgetSettings } from "./widget-settings";

const TOO_LARGE_MESSAGE = `Use an image under ${AGENT_AVATAR_MAX_BYTES / (1024 * 1024)} MB.`;
const WRONG_TYPE_MESSAGE = "Use a PNG, JPEG, WebP or GIF image.";
const MISSING_MESSAGE = "The upload didn't finish. Try again.";
const INVALID_KEY_MESSAGE = "That image couldn't be used.";

function avatarRejected(
  message: string,
): ORPCError<"AVATAR_REJECTED", unknown> {
  return new ORPCError("AVATAR_REJECTED", { message });
}

async function swapAvatarKey(
  workspaceId: string,
  key: string | null,
): Promise<void> {
  const result = await replaceAgentAvatarKey(workspaceId, key);
  if (!result) {
    throw new ORPCError("WORKSPACE_REQUIRED");
  }
  if (result.previousKey && result.previousKey !== key) {
    await deleteProfileImageQuietly(result.previousKey);
  }
}

export const createAvatarUpload =
  ownerProcedure.widgetSettings.createAvatarUpload.handler(
    ({ context, input }) => {
      if (!isAgentAvatarMimeType(input.contentType)) {
        throw avatarRejected(WRONG_TYPE_MESSAGE);
      }
      if (input.size > AGENT_AVATAR_MAX_BYTES) {
        throw avatarRejected(TOO_LARGE_MESSAGE);
      }
      return presignAgentAvatarUpload(
        context.workspaceId,
        input.contentType,
        input.size,
      );
    },
  );

export const confirmAvatarUpload =
  ownerProcedure.widgetSettings.confirmAvatarUpload.handler(
    async ({ context, input }) => {
      const { key } = input;
      if (!isAgentAvatarKey(context.workspaceId, key)) {
        throw avatarRejected(INVALID_KEY_MESSAGE);
      }

      const object = await headProfileImage(key);
      if (!object) {
        throw avatarRejected(MISSING_MESSAGE);
      }
      if (object.size > AGENT_AVATAR_MAX_BYTES) {
        await deleteProfileImage(key);
        throw avatarRejected(TOO_LARGE_MESSAGE);
      }
      if (!isAgentAvatarMimeType(object.contentType)) {
        await deleteProfileImage(key);
        throw avatarRejected(WRONG_TYPE_MESSAGE);
      }

      await swapAvatarKey(context.workspaceId, key);
      return loadSavedWidgetSettings(context.workspaceId);
    },
  );

export const removeAvatar = ownerProcedure.widgetSettings.removeAvatar.handler(
  async ({ context }) => {
    await swapAvatarKey(context.workspaceId, null);
    return loadSavedWidgetSettings(context.workspaceId);
  },
);
