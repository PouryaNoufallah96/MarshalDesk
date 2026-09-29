import "server-only";
import { findMembershipByUserId } from "@marshaldesk/db";
import { contract } from "@marshaldesk/shared";
import { implement, ORPCError } from "@orpc/server";
import { auth } from "@/lib/auth/server";

export type BaseContext = { headers: Headers };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export const base = implement(contract).$context<BaseContext>();

/** A signed-in owner whose email is verified. They may not have a workspace yet. */
export const verifiedProcedure = base.use(async ({ next }) => {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (!user.emailVerified) {
    throw new ORPCError("EMAIL_NOT_VERIFIED");
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  };
  return next({ context: { user: sessionUser } });
});

/** A verified owner with a workspace. `workspaceId` only ever comes from here. */
export const ownerProcedure = verifiedProcedure.use(
  async ({ context, next }) => {
    const membership = await findMembershipByUserId(context.user.id);
    if (!membership) {
      throw new ORPCError("WORKSPACE_REQUIRED");
    }
    return next({
      context: {
        member: membership.member,
        workspaceId: membership.workspace.id,
      },
    });
  },
);
