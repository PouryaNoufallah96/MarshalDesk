import type { Contract } from "@marshaldesk/shared";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

export type AppClient = RouterContractClient<Contract>;

const link = new RPCLink({
  url: "/rpc",
  origin: () => {
    if (typeof window === "undefined") {
      throw new Error("Use the server client (lib/orpc/server) on the server.");
    }
    return window.location.origin;
  },
});

export const client: AppClient = createORPCClient(link);

/** TanStack Query utilities for client components. */
export const orpc = createTanstackQueryUtils(client);
