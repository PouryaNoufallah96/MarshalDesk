import { and } from "@prisma/orm-postgres/orm-client";
import { Temporal } from "temporal-polyfill";
import { getDb } from "./client";

export type WidgetColorValue =
  "blue" | "indigo" | "violet" | "pink" | "red" | "orange" | "green";
export type WidgetPositionValue = "bottom-left" | "bottom-right";

/** Widget settings as stored. `null` text columns mean "use the default". */
export type WidgetSettingsRecord = {
  workspaceName: string;
  agentName: string | null;
  agentAvatarKey: string | null;
  color: WidgetColorValue;
  position: WidgetPositionValue;
  greeting: string | null;
  allowedDomains: string[];
  snippetInstalledAt: string | null;
};

export type WidgetSettingsUpdate = {
  agentName: string;
  color: WidgetColorValue;
  position: WidgetPositionValue;
  greeting: string;
  allowedDomains: string[];
};

const settingsFields = [
  "name",
  "agentName",
  "agentAvatarKey",
  "color",
  "position",
  "greeting",
  "allowedDomains",
  "snippetInstalledAt",
] as const;

type SettingsRow = {
  name: string;
  agentName: string | null;
  agentAvatarKey: string | null;
  color: WidgetColorValue;
  position: WidgetPositionValue;
  greeting: string | null;
  allowedDomains: readonly string[];
  snippetInstalledAt: { toString(): string } | null;
};

function toRecord(row: SettingsRow): WidgetSettingsRecord {
  return {
    workspaceName: row.name,
    agentName: row.agentName,
    agentAvatarKey: row.agentAvatarKey,
    color: row.color,
    position: row.position,
    greeting: row.greeting,
    allowedDomains: [...row.allowedDomains],
    snippetInstalledAt: row.snippetInstalledAt?.toString() ?? null,
  };
}

export async function getWidgetSettings(
  workspaceId: string,
): Promise<WidgetSettingsRecord | null> {
  const row = await getDb()
    .orm.public.Workspace.select(...settingsFields)
    .where({ id: workspaceId })
    .first();
  return row ? toRecord(row) : null;
}

export async function updateWidgetSettings(
  workspaceId: string,
  settings: WidgetSettingsUpdate,
): Promise<WidgetSettingsRecord | null> {
  const row = await getDb()
    .orm.public.Workspace.select(...settingsFields)
    .where({ id: workspaceId })
    .update({
      agentName: settings.agentName,
      color: settings.color,
      position: settings.position,
      greeting: settings.greeting,
      allowedDomains: settings.allowedDomains,
    });
  return row ? toRecord(row) : null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `null` for an unknown workspace, including ids that aren't UUIDs. */
export async function getWidgetAllowedDomains(
  workspaceId: string,
): Promise<string[] | null> {
  if (!UUID_PATTERN.test(workspaceId)) return null;
  const row = await getDb()
    .orm.public.Workspace.select("allowedDomains")
    .where({ id: workspaceId })
    .first();
  return row ? [...row.allowedDomains] : null;
}

/** Records the first time the widget started on an allowed domain. */
export async function markSnippetInstalled(workspaceId: string): Promise<void> {
  await getDb()
    .orm.public.Workspace.select("id")
    .where((w) => and(w.id.eq(workspaceId), w.snippetInstalledAt.isNull()))
    .update({ snippetInstalledAt: Temporal.Now.instant() });
}

/**
 * Swaps the agent avatar key and returns the one it replaced, so the caller
 * can delete the old object only after the new key is saved.
 */
export async function replaceAgentAvatarKey(
  workspaceId: string,
  agentAvatarKey: string | null,
): Promise<{ previousKey: string | null } | null> {
  const db = getDb();
  const plan = db.raw.sql`
    UPDATE workspaces AS w
    SET agent_avatar_key = NULLIF(${agentAvatarKey ?? ""}, ''), updated_at = now()
    FROM (
      SELECT id, agent_avatar_key FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE
    ) AS previous
    WHERE w.id = previous.id
    RETURNING previous.agent_avatar_key AS previous_key`
    .returnsRow({ previous_key: { codecId: "pg/text@1", nullable: true } })
    .build();
  const [row] = await db.runtime().query(plan);
  return row ? { previousKey: row.previous_key ?? null } : null;
}
