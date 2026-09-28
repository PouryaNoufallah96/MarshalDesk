import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import {
  createWorkspaceSchema,
  currentOwnerSchema,
  workspaceSchema,
} from "./schemas/workspace";

export const ERROR_STATUS = {
  UNAUTHORIZED: 401,
  EMAIL_NOT_VERIFIED: 403,
  WORKSPACE_REQUIRED: 403,
} as const;

export type AuthErrorCode = keyof typeof ERROR_STATUS;

const signedInErrors = {
  UNAUTHORIZED: { message: "Sign in to continue." },
  EMAIL_NOT_VERIFIED: { message: "Verify your email to continue." },
};

const ownerErrors = {
  ...signedInErrors,
  WORKSPACE_REQUIRED: { message: "Name your business to continue." },
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
};

export type Contract = typeof contract;
