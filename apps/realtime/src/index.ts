import {
  clientMessageSchema,
  conversationEventSchema,
  REALTIME_PUBLISH_PATH_PREFIX,
  REALTIME_TOKEN_AUDIENCE,
  realtimeTokenClaimsSchema,
  workspaceEventSchema,
  type ConversationEvent,
  type RealtimeTokenClaims,
  type TypingRole,
} from "@marshaldesk/shared/realtime";
import { jwtVerify } from "jose";
import {
  routePartykitRequest,
  Server,
  type Connection,
  type ConnectionContext,
  type Lobby,
  type WSMessage,
} from "partyserver";
import type * as z from "zod";

const TRUSTED_HEADER_PREFIX = "x-marshaldesk-";
const ROLE_HEADER = "x-marshaldesk-role";
const WORKSPACE_HEADER = "x-marshaldesk-workspace";
const MEMBER_HEADER = "x-marshaldesk-member";
const VISITOR_HEADER = "x-marshaldesk-visitor";

type ConnectionState = {
  role: TypingRole;
  workspaceId: string;
  /** The member id for owners, the visitor id for visitors. */
  subjectId: string;
};

type PartyClass = "Conversation" | "Workspace";

function isPartyClass(value: string): value is PartyClass {
  return value === "Conversation" || value === "Workspace";
}

function text(status: number, body: string): Response {
  return new Response(body, { status });
}

const keyCache = new Map<string, Uint8Array>();

function signingKey(secret: string): Uint8Array {
  const cached = keyCache.get(secret);
  if (cached) return cached;
  // The raw string's bytes, exactly as Next.js derives its key.
  const key = new TextEncoder().encode(secret);
  if (key.byteLength < 32) {
    throw new Error("REALTIME_TOKEN_SECRET must be at least 32 bytes.");
  }
  keyCache.set(secret, key);
  return key;
}

async function verifyToken(
  token: string,
  env: Env,
): Promise<RealtimeTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      signingKey(env.REALTIME_TOKEN_SECRET),
      {
        algorithms: ["HS256"],
        audience: REALTIME_TOKEN_AUDIENCE,
        requiredClaims: ["exp", "iat"],
      },
    );
    const claims = realtimeTokenClaimsSchema.safeParse(payload);
    return claims.success ? claims.data : null;
  } catch {
    return null;
  }
}

function mayJoin(
  claims: RealtimeTokenClaims,
  party: PartyClass,
  room: string,
): boolean {
  switch (party) {
    case "Workspace":
      return claims.role === "owner" && claims.workspaceId === room;
    case "Conversation":
      return claims.conversationId === room;
    default: {
      const unhandled: never = party;
      throw new Error(`Unhandled party: ${String(unhandled)}`);
    }
  }
}

function withTrustedHeaders(
  request: Request,
  claims: RealtimeTokenClaims,
): Request {
  const trusted = new Request(request);
  for (const name of [...trusted.headers.keys()]) {
    if (name.startsWith(TRUSTED_HEADER_PREFIX)) trusted.headers.delete(name);
  }
  trusted.headers.set(ROLE_HEADER, claims.role);
  trusted.headers.set(WORKSPACE_HEADER, claims.workspaceId);
  switch (claims.role) {
    case "owner":
      trusted.headers.set(MEMBER_HEADER, claims.memberId);
      break;
    case "visitor":
      trusted.headers.set(VISITOR_HEADER, claims.visitorId);
      break;
    default: {
      const unhandled: never = claims;
      throw new Error(`Unhandled role: ${String(unhandled)}`);
    }
  }
  return trusted;
}

async function authorizeConnect(
  request: Request,
  lobby: Lobby<Env>,
  env: Env,
): Promise<Request | Response> {
  const token = new URL(request.url).searchParams.get("token");
  const claims = token ? await verifyToken(token, env) : null;
  if (!claims) return text(401, "Unauthorized");
  if (
    !isPartyClass(lobby.className) ||
    !mayJoin(claims, lobby.className, lobby.name)
  ) {
    return text(403, "Forbidden");
  }
  return withTrustedHeaders(request, claims);
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

async function authorizePublish(
  request: Request,
  env: Env,
): Promise<Response | undefined> {
  const header = request.headers.get("Authorization") ?? "";
  const [actual, expected] = await Promise.all([
    sha256(header),
    sha256(`Bearer ${env.REALTIME_PUBLISH_SECRET}`),
  ]);
  if (
    !env.REALTIME_PUBLISH_SECRET ||
    !crypto.subtle.timingSafeEqual(actual, expected)
  ) {
    return text(401, "Unauthorized");
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }
  return undefined;
}

function connectionStateFrom(request: Request): ConnectionState | null {
  const role = request.headers.get(ROLE_HEADER);
  const workspaceId = request.headers.get(WORKSPACE_HEADER);
  if (!workspaceId) return null;
  switch (role) {
    case "owner": {
      const memberId = request.headers.get(MEMBER_HEADER);
      return memberId ? { role, workspaceId, subjectId: memberId } : null;
    }
    case "visitor": {
      const visitorId = request.headers.get(VISITOR_HEADER);
      return visitorId ? { role, workspaceId, subjectId: visitorId } : null;
    }
    default:
      return null;
  }
}

async function publish<T>(
  request: Request,
  schema: z.ZodType<T>,
  broadcast: (event: T) => void,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return text(400, "Invalid JSON");
  }
  const event = schema.safeParse(body);
  if (!event.success) return text(400, "Invalid event");
  broadcast(event.data);
  return new Response(null, { status: 204 });
}

/** Shared by both rooms: connections carry the role their token proved. */
abstract class Room extends Server<Env> {
  static override options = { hibernate: true };

  override onConnect(
    connection: Connection<ConnectionState>,
    ctx: ConnectionContext,
  ): void {
    const state = connectionStateFrom(ctx.request);
    if (!state) {
      connection.close(1008, "Unauthorized");
      return;
    }
    connection.setState(state);
  }
}

/** One per conversation (room = conversation id): the visitor and any owner viewing it. */
export class Conversation extends Room {
  override onMessage(
    connection: Connection<ConnectionState>,
    message: WSMessage,
  ): void {
    const role = connection.state?.role;
    if (!role || typeof message !== "string") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    const clientMessage = clientMessageSchema.safeParse(parsed);
    if (!clientMessage.success) return;
    const event: ConversationEvent = {
      type: "typing",
      conversationId: this.name,
      role,
      typing: clientMessage.data.typing,
    };
    this.broadcast(JSON.stringify(event), [connection.id]);
  }

  override onRequest(request: Request): Promise<Response> {
    return publish(request, conversationEventSchema, (event) =>
      this.broadcast(JSON.stringify(event)),
    );
  }
}

/** One per workspace (room = workspace id): owners only. Clients can't send here. */
export class Workspace extends Room {
  override onMessage(): void {}

  override onRequest(request: Request): Promise<Response> {
    return publish(request, workspaceEventSchema, (event) =>
      this.broadcast(JSON.stringify(event)),
    );
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const response = await routePartykitRequest(request, env, {
      prefix: REALTIME_PUBLISH_PATH_PREFIX,
      onBeforeConnect: (req, lobby) => authorizeConnect(req, lobby, env),
      onBeforeRequest: (req) => authorizePublish(req, env),
    });
    return response ?? text(404, "Not found");
  },
} satisfies ExportedHandler<Env>;
