import * as z from "zod";

export const businessNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter your business name." })
  .max(80, { error: "Keep the name under 80 characters." });

export const createWorkspaceSchema = z.object({ name: businessNameSchema });
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const ownerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string(),
});
export type Owner = z.infer<typeof ownerSchema>;

export const currentOwnerSchema = z.object({
  owner: ownerSchema,
  workspace: workspaceSchema,
});
export type CurrentOwner = z.infer<typeof currentOwnerSchema>;
