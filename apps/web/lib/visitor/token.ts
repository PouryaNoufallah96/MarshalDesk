import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { errors, jwtVerify, SignJWT } from "jose";
import * as z from "zod";

const AUDIENCE = "widget";
const ALGORITHM = "HS256";
const TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_AFTER_SECONDS = 24 * 60 * 60;

const claimsSchema = z.object({
  sub: z.string().uuid(),
  wid: z.string().uuid(),
  host: z.string().min(1),
  vsk: z.string().min(1),
  iat: z.number(),
});

export type VisitorTokenClaims = {
  visitorId: string;
  workspaceId: string;
  host: string;
  /** The per-visitor secret; only its SHA-256 is stored. */
  visitorSecret: string;
  issuedAt: number;
};

let cachedKey: Uint8Array | null = null;

function signingKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const value = process.env["VISITOR_TOKEN_SECRET"];
  if (!value) throw new Error("VISITOR_TOKEN_SECRET is not set.");
  const key = new Uint8Array(Buffer.from(value, "base64"));
  if (key.byteLength < 32) {
    throw new Error("VISITOR_TOKEN_SECRET must be at least 32 bytes.");
  }
  cachedKey = key;
  return key;
}

export function createVisitorSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorSecret(visitorSecret: string): string {
  return createHash("sha256").update(visitorSecret).digest("hex");
}

export function visitorSecretMatches(
  visitorSecret: string,
  tokenHash: string,
): boolean {
  const actual = Buffer.from(hashVisitorSecret(visitorSecret), "hex");
  const expected = Buffer.from(tokenHash, "hex");
  return (
    actual.byteLength === expected.byteLength &&
    timingSafeEqual(actual, expected)
  );
}

export async function signVisitorToken(input: {
  visitorId: string;
  workspaceId: string;
  host: string;
  visitorSecret: string;
}): Promise<string> {
  return new SignJWT({
    wid: input.workspaceId,
    host: input.host,
    vsk: input.visitorSecret,
  })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setSubject(input.visitorId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(signingKey());
}

/** Checks the signature, expiry and audience. `null` for any invalid token. */
export async function verifyVisitorToken(
  token: string,
): Promise<VisitorTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: [ALGORITHM],
      audience: AUDIENCE,
      requiredClaims: ["exp", "iat", "sub"],
    });
    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) return null;
    return {
      visitorId: claims.data.sub,
      workspaceId: claims.data.wid,
      host: claims.data.host,
      visitorSecret: claims.data.vsk,
      issuedAt: claims.data.iat,
    };
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
}

export function shouldRefreshVisitorToken(claims: VisitorTokenClaims): boolean {
  return Date.now() / 1000 - claims.issuedAt > REFRESH_AFTER_SECONDS;
}
