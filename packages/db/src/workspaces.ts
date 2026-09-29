import { getDb } from "./client";
import { isUniqueViolation } from "./errors";

export type WorkspaceRecord = { id: string; name: string };

export type MemberRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner";
  name: string;
  avatarUrl: string | null;
  avatarKey: string | null;
};

export type Membership = { member: MemberRecord; workspace: WorkspaceRecord };

const memberFields = [
  "id",
  "workspaceId",
  "userId",
  "role",
  "name",
  "avatarUrl",
  "avatarKey",
] as const;

function toMemberRecord(row: MemberRecord): MemberRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    name: row.name,
    avatarUrl: row.avatarUrl,
    avatarKey: row.avatarKey,
  };
}

// Not workspace-scoped: this lookup is what establishes the caller's workspace scope.
export async function findMembershipByUserId(
  userId: string,
): Promise<Membership | null> {
  const row = await getDb()
    .orm.public.Member.select(...memberFields)
    .include("workspace", (workspace) => workspace.select("id", "name"))
    .where({ userId })
    .first();
  if (!row) return null;
  if (!row.workspace) throw new Error(`Member ${row.id} has no workspace`);
  return {
    member: toMemberRecord(row),
    workspace: { id: row.workspace.id, name: row.workspace.name },
  };
}

export async function createWorkspaceWithOwner(input: {
  userId: string;
  workspaceName: string;
  ownerName: string;
  avatarUrl: string | null;
}): Promise<Membership & { created: boolean }> {
  const existing = await findMembershipByUserId(input.userId);
  if (existing) return { ...existing, created: false };

  try {
    const membership = await getDb().transaction(async (tx) => {
      const workspace = await tx.orm.public.Workspace.select(
        "id",
        "name",
      ).create({
        name: input.workspaceName,
      });
      const member = await tx.orm.public.Member.select(...memberFields).create({
        workspaceId: workspace.id,
        userId: input.userId,
        role: "owner",
        name: input.ownerName,
        avatarUrl: input.avatarUrl,
        avatarKey: null,
      });
      return { member: toMemberRecord(member), workspace };
    });
    return { ...membership, created: true };
  } catch (error) {
    if (!isUniqueViolation(error, "members_user_id_key")) throw error;
    const winner = await findMembershipByUserId(input.userId);
    if (!winner) throw error;
    return { ...winner, created: false };
  }
}

export async function getWorkspace(
  workspaceId: string,
): Promise<WorkspaceRecord | null> {
  return getDb()
    .orm.public.Workspace.select("id", "name")
    .where({ id: workspaceId })
    .first();
}
