import "server-only";
import { findVisitor, type VisitorRecord } from "@marshaldesk/db";
import { normalizeDomain } from "@marshaldesk/shared";
import {
  verifyVisitorToken,
  visitorSecretMatches,
  type VisitorTokenClaims,
} from "./token";

/** Exact hostname match on any port. Allowed domains are stored normalized. */
export function isHostAllowed(
  host: string,
  allowedDomains: readonly string[],
): boolean {
  const normalized = normalizeDomain(host);
  return normalized.length > 0 && allowedDomains.includes(normalized);
}

export type VisitorSession = {
  claims: VisitorTokenClaims;
  visitor: VisitorRecord;
};

/** A token is valid only while its secret still matches the stored hash of its visitor. */
export async function resolveVisitorToken(
  token: string,
): Promise<VisitorSession | null> {
  const claims = await verifyVisitorToken(token);
  if (!claims) return null;
  const visitor = await findVisitor(claims.workspaceId, claims.visitorId);
  if (!visitor) return null;
  if (!visitorSecretMatches(claims.visitorSecret, visitor.tokenHash)) {
    return null;
  }
  return { claims, visitor };
}

export function bearerToken(headers: Headers): string | null {
  const value = headers.get("authorization");
  const match = value?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}
