import { VISITOR_TOKEN_STORAGE_PREFIX } from "@marshaldesk/shared";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";
import type { AppClient } from "@/lib/orpc/client";

// Storage can throw (blocked third-party storage, private mode), so the token
// also lives in memory for the rest of the visit.
const memoryTokens = new Map<string, string>();
let currentToken: string | null = null;

function storageKey(workspaceId: string): string {
  return `${VISITOR_TOKEN_STORAGE_PREFIX}${workspaceId}`;
}

export function readVisitorToken(workspaceId: string): string | null {
  try {
    const stored = window.localStorage.getItem(storageKey(workspaceId));
    if (stored) return stored;
  } catch {}
  return memoryTokens.get(workspaceId) ?? null;
}

export function saveVisitorToken(workspaceId: string, token: string) {
  currentToken = token;
  memoryTokens.set(workspaceId, token);
  try {
    window.localStorage.setItem(storageKey(workspaceId), token);
  } catch {}
}

export function clearVisitorToken(workspaceId: string) {
  currentToken = null;
  memoryTokens.delete(workspaceId);
  try {
    window.localStorage.removeItem(storageKey(workspaceId));
  } catch {}
}

const link = new RPCLink({
  url: "/rpc",
  origin: () => window.location.origin,
  headers: (): Record<string, string> =>
    currentToken ? { authorization: `Bearer ${currentToken}` } : {},
});

/** Calls `widget.*` as the visitor saved with `saveVisitorToken`. */
export const visitorClient: AppClient = createORPCClient(link);

export const visitorOrpc = createTanstackQueryUtils(visitorClient);

export function createVisitorQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5_000 } },
  });
}
