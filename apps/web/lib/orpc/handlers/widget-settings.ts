import "server-only";
import {
  getWidgetSettings,
  updateWidgetSettings,
  type WidgetSettingsRecord,
} from "@marshaldesk/db";
import {
  DEFAULT_GREETING,
  defaultAgentName,
  type SavedWidgetSettings,
} from "@marshaldesk/shared";
import { ORPCError } from "@orpc/server";
import { profileImageUrl } from "@/lib/storage/public-url";
import { ownerProcedure } from "../procedures";

export function toSavedWidgetSettings(
  record: WidgetSettingsRecord,
): SavedWidgetSettings {
  return {
    settings: {
      agentEnabled: record.agentEnabled,
      agentName: record.agentName ?? defaultAgentName(record.workspaceName),
      color: record.color,
      position: record.position,
      greeting: record.greeting ?? DEFAULT_GREETING,
      allowedDomains: record.allowedDomains,
    },
    agentAvatarUrl: record.agentAvatarKey
      ? profileImageUrl(record.agentAvatarKey)
      : null,
  };
}

export async function loadSavedWidgetSettings(
  workspaceId: string,
): Promise<SavedWidgetSettings> {
  const record = await getWidgetSettings(workspaceId);
  if (!record) {
    throw new ORPCError("WORKSPACE_REQUIRED");
  }
  return toSavedWidgetSettings(record);
}

export const getSettings = ownerProcedure.widgetSettings.get.handler(
  ({ context }) => loadSavedWidgetSettings(context.workspaceId),
);

export const updateSettings = ownerProcedure.widgetSettings.update.handler(
  async ({ context, input }) => {
    const record = await updateWidgetSettings(context.workspaceId, {
      ...input,
      allowedDomains: [...new Set(input.allowedDomains)],
    });
    if (!record) {
      throw new ORPCError("WORKSPACE_REQUIRED");
    }
    return toSavedWidgetSettings(record);
  },
);
