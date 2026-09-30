import "server-only";
import {
  findMembershipByUserId,
  getWidgetAllowedDomains,
} from "@marshaldesk/db";
import { contract } from "@marshaldesk/shared";
import { implement, ORPCError } from "@orpc/server";
import { auth } from "@/lib/auth/server";
import {
  bearerToken,
  isHostAllowed,
  resolveVisitorToken,
} from "@/lib/visitor/session";

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
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in to continue." });
  }
  if (!user.emailVerified) {
    throw new ORPCError("EMAIL_NOT_VERIFIED", {
      message: "Verify your email to continue.",
    });
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
      throw new ORPCError("WORKSPACE_REQUIRED", {
        message: "Name your business to continue.",
      });
    }
    return next({
      context: {
        member: membership.member,
        workspaceId: membership.workspace.id,
      },
    });
  },
);

/**
 * A widget visitor, from the `Authorization: Bearer` visitor token. `workspaceId`
 * only ever comes from the token, and removing the token's host from the
 * allowed domains cuts it off.
 */
export const visitorProcedure = base.use(async ({ context, next }) => {
  const token = bearerToken(context.headers);
  const session = token ? await resolveVisitorToken(token) : null;
  if (!session) {
    throw new ORPCError("VISITOR_UNAUTHORIZED", {
      message: "Your chat session has expired.",
    });
  }
  const { workspaceId, host } = session.claims;
  const allowedDomains = await getWidgetAllowedDomains(workspaceId);
  if (!allowedDomains) {
    throw new ORPCError("VISITOR_UNAUTHORIZED", {
      message: "Your chat session has expired.",
    });
  }
  if (!isHostAllowed(host, allowedDomains)) {
    throw new ORPCError("DOMAIN_NOT_ALLOWED", {
      message: "The widget isn't allowed on this website.",
    });
  }
  return next({
    context: { workspaceId, host, visitor: { id: session.visitor.id } },
  });
});
