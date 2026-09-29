import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { routes } from "@/lib/routes";

const SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

const neonAuthProxy = auth.middleware({ loginUrl: routes.signIn });

// Fast signed-in check. Verification and workspace gates live in the layouts
// and `ownerProcedure`. The SDK redirects every matched path without a session,
// so the matcher lists only protected routes, plus the home page when Neon
// returns there with a session verifier after Google or a magic link (it drops
// our callbackURL while the branch has no trusted origins).
export default async function proxy(request: NextRequest) {
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
    {
      source: "/",
      has: [{ type: "query", key: "neon_auth_session_verifier" }],
    },
  ],
};
