# MarshalDesk: Technology stack (v1)

> **For coding agents:** this is the source of truth for _how_ MarshalDesk is built. [`PRD.md`](./PRD.md) defines _what_ it does, and [`CONTEXT.md`](../CONTEXT.md) defines the vocabulary. Read all three before implementing anything. Several libraries here are pinned to pre-release or recently released versions, and your training data describes older versions, so **fetch the linked docs instead of relying on memory** (see "Versions and documentation sources").

|                |                                                     |
| -------------- | --------------------------------------------------- |
| Status         | Agreed (Sep 26, 2026)                               |
| Companion docs | [`PRD.md`](./PRD.md), [`CONTEXT.md`](../CONTEXT.md) |

---

## 1. Overview

| Layer                              | Choice                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| App framework (frontend + backend) | Next.js 16, App Router, no `src/` directory                                                     |
| Language                           | TypeScript, strict mode                                                                         |
| UI                                 | Tailwind CSS + shadcn/ui                                                                        |
| Forms and validation               | React Hook Form + Zod                                                                           |
| API                                | oRPC v2 (beta), contract-first, served as both RPC and OpenAPI                                  |
| Data fetching and mutations        | TanStack Query (via `@orpc/tanstack-query`), prefetched in server components                    |
| Database access                    | Prisma 8 (release candidate), server-side only                                                  |
| Database                           | Neon Postgres + pgvector                                                                        |
| Auth                               | Neon Auth (Managed Better Auth)                                                                 |
| Real time                          | PartyKit, now Cloudflare PartyServer (`partyserver` + `partysocket`)                            |
| AI                                 | Vercel AI SDK 7 + Neon AI Gateway (`@neon/ai-sdk-provider`) + OpenAI embeddings                 |
| Background work                    | Neon Functions (storage trigger + schedule trigger)                                             |
| File storage                       | Neon Object Storage                                                                             |
| Markdown rendering                 | Streamdown                                                                                      |
| Avatars                            | DiceBear                                                                                        |
| Hosting                            | Vercel (web app), Cloudflare (real-time), Neon (database, auth, functions, storage, AI gateway) |
| Package manager and repo           | pnpm workspaces (no Turborepo)                                                                  |
| Linting and formatting             | ESLint (flat config) + Prettier                                                                 |

**Explicitly not used:** Neon Data API, row-level security, server actions, Drizzle, Biome, Turborepo, LangChain, Vercel or Neon WebSockets, client-side database access.

---

## 2. Repository layout

A pnpm workspace with three deployable apps and shared packages:

```
/
├── apps/
│   ├── web/          # Next.js 16: dashboard, widget iframe page, oRPC handlers, agent orchestration  → Vercel
│   ├── realtime/     # PartyServer on Cloudflare Workers + Durable Objects                            → Cloudflare
│   └── functions/    # Neon Functions: ingest, suggested questions, auto-close                        → Neon
├── packages/
│   ├── db/           # Prisma 8 schema, migrations, generated client, workspace-scoped data access
│   └── shared/       # oRPC contract, Zod schemas, real-time event types, shared constants
├── docs/             # PRD.md, TECH-STACK.md
└── CONTEXT.md
```

The widget's embed script (the small loader a customer pastes into their site) lives in `apps/web/embed/` but has its own tiny build, separate from Next.js: **esbuild** bundles it to `apps/web/public/embed.js` (git-ignored, rebuilt by `dev` and `build`), served with a five-minute cache under a stable filename.

---

## 3. Frontend

- **Next.js 16 App Router**, no `src/` directory. Server components by default. Client components only where interactivity needs them.
- **No server actions.** Every read and write goes through oRPC procedures.
- **Tailwind CSS + shadcn/ui** for the dashboard _and_ the widget: one design system.
- **React Hook Form + Zod** for dashboard forms. Zod schemas come from `packages/shared` so forms and API inputs validate identically.
- **Streamdown** renders Markdown in messages. It's built for streaming AI text, so partially streamed agent replies render cleanly.
- **Widget:** the chat UI is a Next.js route (for example `/widget/[workspaceId]`) loaded in an iframe. The embed script is a tiny vanilla TypeScript bundle that injects the launcher bubble and the iframe into the customer's page, and passes position and color settings.
- **Dashboard widget settings** use the split layout from the PRD (settings on the left, a live widget preview on the right). The preview renders the real widget components.

---

## 4. API layer: oRPC v2 + TanStack Query

### Contract-first

1. Define the API as an **oRPC contract** (`@orpc/contract`) in `packages/shared`. Inputs, outputs and errors use Zod, and every procedure carries OpenAPI route metadata.
2. **Implement** the contract in `apps/web` with `implement(contract)`.
3. Serve the same implementation through **two handlers**:
   - `RPCHandler` for the app's own clients (dashboard and widget), for example at `/rpc`
   - `OpenAPIHandler` for REST access and a generated OpenAPI spec, for example at `/api`

### Base procedures and middleware

| Base               | Used by   | Middleware adds to context                                                                                        |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `ownerProcedure`   | Dashboard | Verifies the Neon Auth session, loads the owner's membership, and adds `user` and `workspaceId`                   |
| `visitorProcedure` | Widget    | Verifies the visitor token (checked against the workspace's allowed domains) and adds `visitor` and `workspaceId` |

Errors are typed with the contract's `errors` definitions and thrown as `ORPCError`.

### TanStack Query

- **Server:** server components call procedures directly, in the same process with no HTTP (server-side client), to **prefetch** into a TanStack Query client, then hand the data to the browser with `HydrationBoundary`. Follow oRPC's documented TanStack Query and SSR setup; don't invent one.
- **Client:** `@orpc/tanstack-query` utilities (`createTanstackQueryUtils`) for `useQuery` and `useMutation`.
- **Real-time updates:** PartyKit events write directly into the TanStack Query cache (append a message, update a conversation's state) instead of triggering refetches.

---

## 5. Data: Prisma 8 + Neon Postgres

- **Prisma 8 (release candidate)** is used for its native, typed pgvector support (`@prisma/orm-extension-pgvector`): `vector(N)` columns and typed `cosineDistance` / `cosineSimilarity` queries. Prisma 8 requires Node.js 24+, which Vercel and Neon Functions both provide.
- **Fallback:** if Prisma 8 proves unstable, drop to **Prisma 7.10** (stable), with the vector column as `Unsupported("vector")` and the two vector operations (saving chunk embeddings, similarity search) as raw SQL. The change is contained in `packages/db`.
- **`packages/db`** owns the schema, migrations, the generated client, and all data-access functions. `apps/web` and `apps/functions` import from it and never create their own clients.
- **Migrations** run against the Neon `development` branch first, then `production`.
- **Server-side only.** The browser never talks to the database.
- **Tenant isolation, with no row-level security:** every data-access function that reads or writes workspace data takes `workspaceId` as a required argument and filters on it. `workspaceId` only ever comes from the procedure context (the session or visitor token), never from client input. Vector search filters by `workspaceId` before ranking.
- **Verify at implementation:** the recommended way to connect Prisma 8 to Neon from Vercel (serverless) and from Neon Functions.

---

## 6. Auth

- **Neon Auth (Managed Better Auth)** handles owner accounts: email and password, magic link (fallback: an emailed 6-digit code, or drop it), Google sign-in, email verification by 6-digit code, and password reset. Emails go through Neon's shared sender.
- Sessions are read **server-side** in `ownerProcedure` and in server components.
- **Visitor tokens** are JWTs we sign ourselves with `jose`. They're long-lived, refreshed periodically, bound to one workspace, and stored in the widget iframe's browser storage. Only a hash is stored in the database.
  - HS256, `aud: "widget"`, claims `{ sub: visitorId, wid: workspaceId, host, vsk }`, 30-day lifetime, re-issued by `widget.start` once a day. `vsk` is a random per-visitor secret; the database keeps only its SHA-256, so refreshing a token in one tab doesn't sign out another.
  - `visitorProcedure` reads the token from `Authorization: Bearer`, checks it against the stored hash, and rejects it once its `host` is no longer an allowed domain, so removing a domain cuts off tokens already issued.
  - The embed script passes the page's hostname to the iframe. `widget.start` only issues tokens for allowed domains, and `proxy.ts` sends a per-workspace `Content-Security-Policy: frame-ancestors` built from the allowed domains (exact host, any port; `'none'` when the list is empty), so browsers refuse to render the widget anywhere else. The host is reported by the page, so a script outside a browser can still claim an allowed domain and start a session; a public chat widget accepts that, and the CSP is what keeps the widget off other sites. The same goes for "snippet installed", which is recorded on the first session for an allowed domain.

---

## 7. Real time: PartyKit (Cloudflare PartyServer)

- **Source of truth for docs: [github.com/cloudflare/partykit](https://github.com/cloudflare/partykit)** (`packages/partyserver` and `packages/partysocket`). The old partykit.io docs are conceptually similar, but their package names, import paths and deployment (the PartyKit CLI instead of `wrangler`) are out of date.
- Server: `partyserver` on Cloudflare Workers + Durable Objects, deployed with `wrangler` from `apps/realtime`.
- Clients: `partysocket` in the dashboard and the widget.
- **Rooms:** two party classes, both with hibernation (`static options = { hibernate: true }`), and rooms named by id. `Conversation` (room = conversation id) carries messages, streamed agent text, typing indicators and state changes to the visitor and any owner viewing it. `Workspace` (room = workspace id) carries inbox updates and notifications to the owner only. URLs are `/parties/{conversation|workspace}/{id}`. The event types live in `packages/shared/src/realtime.ts`.
- **Connection security:** both the dashboard and the widget open sockets with a **realtime token** minted by Next.js: jose HS256 with `REALTIME_TOKEN_SECRET`, `aud: realtime`, 60 s expiry, used only to open the socket. `partysocket`'s async `query` fetches a fresh one on every reconnect. Owners get it from `realtime.getToken` (`ownerProcedure`, which first confirms a conversation belongs to their workspace), visitors from `widget.getRealtimeToken` (for the conversation the widget shows, their latest by default, after checking it's theirs). The Worker doesn't verify Neon Auth tokens: Neon Auth doesn't support custom claims, so its token can't carry `workspaceId`, and the Worker would need database access to map a user to a workspace or conversation.
- **Room checks:** `onBeforeConnect` verifies the token (missing, invalid, expired or wrong audience → 401) and its claims against the room: `workspace` only for an owner of that workspace, `conversation` only for the token's `conversationId` (otherwise 403). It then strips client-sent `x-marshaldesk-*` headers and sets trusted ones, which `onConnect` stores in the connection state.
- **Publishing:** the Next.js server POSTs one event per request to the room with `Authorization: Bearer ${REALTIME_PUBLISH_SECRET}`, a separate secret the Worker checks in constant time. The body is validated against the room's event schema and broadcast. Publishing never fails the user's write: each POST is time-boxed and failures are only logged.
- **Client messages:** only typing may originate from clients, and only in a conversation room. The Worker relays it with the role from the token, never from the message. Everything else goes through oRPC.
- **Rule:** every message is saved to Postgres **before** it's published. PartyKit only delivers, and clients rebuild their state from the API when they reconnect.

---

## 8. AI

- **Vercel AI SDK 7** (`ai@7`) for every model call: classification (structured output), answers (streaming, image input), and suggested-question generation.
- **Neon AI Gateway** via `@neon/ai-sdk-provider` for chat models. Needs a Launch or Scale plan.
- **OpenAI embeddings** via `@ai-sdk/openai`, called directly, because the Neon AI Gateway has no embeddings.
- **Execution:** the widget's `sendMessage` procedure saves the message and returns right away. The agent pipeline (classify, embed, retrieve, answer) runs afterwards in Next.js's `after()`, within the Vercel function's 300-second limit, and streams text chunks to the conversation's PartyKit room. The final message is saved to Postgres when streaming finishes.
- **Models are deferred to implementation** (see the PRD). The answer model must support image input.

---

## 9. Background work: Neon Functions

All live in `apps/functions`, run on Node.js 24, and use `packages/db`.

| Function            | Trigger                                                                         | Does                                                                                  |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ingest              | Object Storage file-created trigger (text sources are sent directly by the app) | Parse → chunk → embed → save chunks and vectors → update the source's status          |
| Suggested questions | After any knowledge base change                                                 | Regenerate the workspace's four suggested questions                                   |
| Auto-close          | Schedule trigger (for example every 15 minutes)                                 | Close open conversations with no messages for 24 hours, and publish the closed notice |

- **PDF parsing:** `unpdf`. Markdown and TXT are read as-is.
- **Chunking:** a small custom splitter (by headings, then paragraphs, around 800 tokens with overlap). No LangChain.

---

## 10. Storage and uploads

- **Neon Object Storage** (S3-compatible) holds knowledge files, image attachments, and uploaded avatars.
- Uploads go **directly from the browser** using short-lived presigned URLs issued by an oRPC procedure, which enforces type and size first (10 MB).
- **Buckets:**
  - `profile-images` is **public-read**. It holds agent avatars (and later member photos), which the dashboard and widget load straight from the object's public URL: `${STORAGE_PUBLIC_BASE_URL}/profile-images/<key>`.
  - `uploads` is private and reserved for sources and attachments.
- **Agent avatars** are limited to **2 MB** (Jan's decision; the 10 MB in PRD L-3 applies to attachments and sources) and must be PNG, JPEG, WebP or GIF.
- **Avatar flow:**
  1. `createAvatarUpload` checks the declared type and size and generates the key on the server, under the workspace's prefix: `workspaces/<workspaceId>/agent-avatar/<uuid>.<ext>`. It returns a presigned PUT (valid for 2 minutes) that signs `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`, which is safe because every upload gets a new key.
  2. The browser PUTs the file with exactly those headers.
  3. `confirmAvatarUpload` accepts only keys under the caller's own prefix, then HEAD-checks the stored object's real size and type. A presigned PUT can't limit size, so this is the actual 2 MB check. Rejected objects are deleted. On success it saves the key and only then deletes the previous avatar (a failed delete is logged and leaves an orphan).
  4. `removeAvatar` clears the key and deletes the object, and the widget falls back to the generated DiceBear avatar.
  - Uploads that are presigned but never confirmed are left in the bucket. That's acceptable for v1.
- **CORS** on `profile-images` (allowing PUT, GET and HEAD from `NEXT_PUBLIC_APP_URL`) is set by `pnpm --filter @marshaldesk/web storage:cors`. Pass extra origins as arguments. It's idempotent, so run it once per branch's storage and again whenever the app's origin changes.
- **SDK settings:** `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` with `forcePathStyle: true`, and `requestChecksumCalculation` and `responseChecksumValidation` set to `WHEN_REQUIRED`. Without that, the presigner signs a checksum of an empty body and every browser PUT fails.

---

## 11. Visitor details

- **Country and city:** `geolocation()` from `@vercel/functions`, which reads the location headers Vercel adds to every request. No geo-IP service, and the raw IP is never stored.
- **Timezone, local time and language:** sent by the widget from the browser, which is more accurate than IP-based guesses.
- **Device, browser and OS:** parsed from the user agent with `ua-parser-js`.

---

## 12. Tooling

- **TypeScript strict** in every package.
- **pnpm workspaces.** No Turborepo.
- **ESLint** (flat config, `eslint-config-next`) + **`eslint-config-prettier`**, and **Prettier** with `prettier-plugin-tailwindcss`. One shared config at the repo root.
- **No automated test suite in v1.** The manual checklist in the PRD (section 9) is the acceptance test. Run the type check before calling any change done, because end-to-end types are the main correctness signal.

---

## 13. Deployment and environments

| Target     | Deploys                                        | Tool                                                                           |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Vercel     | `apps/web`                                     | Vercel Git integration                                                         |
| Cloudflare | `apps/realtime`                                | `wrangler`                                                                     |
| Neon       | Database, auth, functions, storage, AI gateway | Neon CLI (`neon.ts` + `neon deploy` recommended, to confirm at implementation) |

- **Neon branches:** `development` and `production`. Migrations always hit `development` first.
- **Region:** Frankfurt preferred, Ohio is fine.
- **Google sign-in** in production needs our own Google app credentials, configured per Neon branch.

---

## 14. Versions and documentation sources

Your training data is likely out of date for these. Always check the linked source.

| Library                                     | Version                                 | Docs                                                                     | Watch out for                                                                                        |
| ------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Next.js                                     | 16                                      | [nextjs.org/docs](https://nextjs.org/docs)                               | App Router, `after()`                                                                                |
| oRPC                                        | **v2 beta** (`2.0.0-beta.x`, pin exact) | [orpc.dev](https://orpc.dev) ([llms.txt](https://orpc.dev/llms.txt))     | A plain install gives **v1**. Install with `@beta`. v1 docs live at v1.orpc.dev and are wrong for v2 |
| Prisma                                      | **8 release candidate**                 | [prisma.io/docs/orm/v8](https://www.prisma.io/docs/orm/v8)               | New architecture (contracts, new CLI). Prisma 7 knowledge doesn't carry over                         |
| Vercel AI SDK                               | 7                                       | [ai-sdk.dev/docs](https://ai-sdk.dev/docs)                               | v7 released Jun 25, 2026. v6 examples may not match                                                  |
| PartyServer                                 | latest                                  | [github.com/cloudflare/partykit](https://github.com/cloudflare/partykit) | Not partykit.io                                                                                      |
| Neon (Auth, Functions, Storage, AI Gateway) | GA since Sep 18, 2026                   | [neon.com/docs](https://neon.com/docs)                                   | The AI Gateway has no embeddings                                                                     |
| TanStack Query                              | 5                                       | [tanstack.com/query](https://tanstack.com/query)                         | Use it through `@orpc/tanstack-query`                                                                |

---

## 15. Deferred to implementation

1. Models: classifier, answer (must support images), embeddings
2. DOCX support
3. Whether magic links work with Neon's shared email sender
4. DiceBear avatar style
5. ~~PartyServer details~~ Resolved: `Conversation` and `Workspace` party classes with hibernation, rooms named by id, sockets opened with short-lived Next-minted realtime tokens checked in `onBeforeConnect`, and publishing over HTTP with a separate secret (see section 7)
6. How Prisma 8 connects to Neon on Vercel and in Neon Functions
7. ~~The embed script's bundler~~ Resolved: esbuild (see section 2). It is a single, fast devDependency with no config, and the loader is one small vanilla TypeScript file
8. Whether to use `neon.ts` + `neon deploy` for Neon services
