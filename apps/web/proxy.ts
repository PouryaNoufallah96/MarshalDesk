import { auth } from "@/lib/auth/server";
import { routes } from "@/lib/routes";

// Fast signed-in check. Verification and workspace gates live in the layouts
// and `ownerProcedure`. The SDK redirects every matched path without a session,
// so the matcher lists only protected routes. OAuth and magic-link callbacks
// must land on a matched route, where the SDK exchanges the session verifier.
export default auth.middleware({ loginUrl: routes.signIn });

export const config = {
  matcher: ["/dashboard/:path*", "/auth/welcome"],
};
