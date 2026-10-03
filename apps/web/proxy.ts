import { getWidgetAllowedDomains } from "@marshaldesk/db";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { routes } from "@/lib/routes";
import { DEVELOPMENT_HOSTS } from "@/lib/visitor/development-hosts";

const SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";
const WIDGET_PATH = /^\/widget\/([^/]+)/;

const neonAuthProxy = auth.middleware({ loginUrl: routes.signIn });

function frameAncestors(allowedDomains: readonly string[] | null): string {
  const hosts = allowedDomains
    ? [...new Set([...allowedDomains, ...DEVELOPMENT_HOSTS])]
    : [];
  if (hosts.length === 0) {
    return "frame-ancestors 'none'";
  }
  const sources = hosts.flatMap((domain) => [
    `http://${domain}`,
    `https://${domain}`,
    `http://${domain}:*`,
    `https://${domain}:*`,
  ]);
  return `frame-ancestors ${sources.join(" ")}`;
}

// The widget iframe is public: no auth, only a per-workspace frame-ancestors
// policy so it renders only inside the workspace's allowed domains.
async function widgetProxy(workspaceId: string): Promise<NextResponse> {
  const allowedDomains = await getWidgetAllowedDomains(workspaceId);
  const response = NextResponse.next();
  response.headers.set(
    "Content-Security-Policy",
    frameAncestors(allowedDomains),
  );
  return response;
}

// Fast signed-in check. Verification and workspace gates live in the layouts
// and `ownerProcedure`. The SDK redirects every matched path without a session,
// so the matcher lists only protected routes, plus the home page when Neon
// returns there with a session verifier after Google or a magic link (it drops
// our callbackURL while the branch has no trusted origins).
export default async function proxy(request: NextRequest) {
  const widget = request.nextUrl.pathname.match(WIDGET_PATH);
  if (widget?.[1]) {
    return widgetProxy(widget[1]);
  }

  const response = await neonAuthProxy(request);
  const location = response.headers.get("location");
  const exchangedOnHome =
    request.nextUrl.pathname === routes.home &&
    request.nextUrl.searchParams.has(SESSION_VERIFIER_PARAM) &&
    location !== null &&
    new URL(location, request.url).pathname === routes.home;
  if (exchangedOnHome) {
    response.headers.set(
      "location",
      new URL(routes.dashboard, request.url).toString(),
    );
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/welcome",
    "/widget/:path*",
    {
      source: "/",
      has: [{ type: "query", key: "neon_auth_session_verifier" }],
    },
  ],
};
