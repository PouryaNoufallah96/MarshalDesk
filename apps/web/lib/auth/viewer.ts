import "server-only";
import type { CurrentOwner } from "@marshaldesk/shared";
import { isDefinedError, safe } from "@orpc/client";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth/server";
import { serverClient } from "@/lib/orpc/server";
import { routes, verifyEmailRoute } from "@/lib/routes";

export type Viewer =
  | { status: "signed-out" }
  | { status: "unverified"; email: string }
  | { status: "needs-workspace" }
  | { status: "ready"; current: CurrentOwner };

export type ViewerStatus = Viewer["status"];

/** Resolves who is looking at the page, once per request, through `owner.getCurrent`. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const [error, current] = await safe(serverClient.owner.getCurrent());
  if (!error) {
    return { status: "ready", current };
  }
  if (!isDefinedError(error)) {
    throw error;
  }

  switch (error.code) {
    case "UNAUTHORIZED":
      return { status: "signed-out" };
    case "EMAIL_NOT_VERIFIED": {
      const { data } = await auth.getSession();
      return data?.user
        ? { status: "unverified", email: data.user.email }
        : { status: "signed-out" };
    }
    case "WORKSPACE_REQUIRED":
      return { status: "needs-workspace" };
    default: {
      const unhandled: never = error;
      throw new Error(`Unhandled viewer error: ${JSON.stringify(unhandled)}`);
    }
  }
});

function destinationFor(viewer: Viewer): string {
  switch (viewer.status) {
    case "signed-out":
      return routes.signIn;
    case "unverified":
      return verifyEmailRoute(viewer.email);
    case "needs-workspace":
      return routes.welcome;
    case "ready":
      return routes.dashboard;
    default: {
      const unhandled: never = viewer;
      throw new Error(`Unhandled viewer: ${JSON.stringify(unhandled)}`);
    }
  }
}

/** Redirects to the right place unless the viewer is in one of the allowed states. */
export async function requireViewer<const S extends ViewerStatus>(
  allowed: readonly S[],
): Promise<Extract<Viewer, { status: S }>> {
  const viewer = await getViewer();
  if (!isAllowed(viewer, allowed)) {
    redirect(destinationFor(viewer));
  }
  return viewer;
}

function isAllowed<S extends ViewerStatus>(
  viewer: Viewer,
  allowed: readonly S[],
): viewer is Extract<Viewer, { status: S }> {
  return (allowed as readonly ViewerStatus[]).includes(viewer.status);
}
