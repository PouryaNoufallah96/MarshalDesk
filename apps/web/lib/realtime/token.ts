import "server-only";
import {
  REALTIME_TOKEN_AUDIENCE,
  REALTIME_TOKEN_TTL_SECONDS,
  type RealtimeTokenClaims,
} from "@marshaldesk/shared";
import { SignJWT } from "jose";

let cachedKey: Uint8Array | null = null;

function signingKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const value = process.env["REALTIME_TOKEN_SECRET"];
  if (!value) throw new Error("REALTIME_TOKEN_SECRET is not set.");
  const key = new Uint8Array(Buffer.from(value, "base64"));
  if (key.byteLength < 32) {
    throw new Error("REALTIME_TOKEN_SECRET must be at least 32 bytes.");
  }
  cachedKey = key;
  return key;
}

/** Only opens a socket, so it's short-lived; clients fetch a fresh one on every reconnect. */
export function signRealtimeToken(
  claims: RealtimeTokenClaims,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(REALTIME_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${REALTIME_TOKEN_TTL_SECONDS}s`)
    .sign(signingKey());
}
