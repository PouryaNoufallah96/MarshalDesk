import "server-only";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { headers } from "next/headers";
import type { AppClient } from "./client";
import { router } from "./router";

/** Calls procedures in-process (no HTTP) from server components. */
export const serverClient: AppClient = createRouterClient(router, {
  context: async () => ({ headers: await headers() }),
});

/** Same query keys as the browser utilities, so prefetched data hydrates. */
export const orpcServer = createTanstackQueryUtils(serverClient);
