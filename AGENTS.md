# AGENTS.md

MarshalDesk is an Intercom-style customer support app: businesses embed a chat widget, and visitors talk to an AI agent that answers **only** from the business's own knowledge base, or to the business owner in a real-time dashboard. The core idea is **an agent that knows its limits**: every message is classified first, off-topic messages are declined, and anything the agent can't answer confidently goes to a human.

v1 is a fully working showcase product built for a YouTube video. It should work end to end. It doesn't need billing, compliance tooling, or enterprise hardening.

## Read these first

| Document                                   | What it's for                                                                                                                       | When to read it                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`docs/PRD.md`](docs/PRD.md)               | **What** to build: flows, requirements (with IDs like `W-4`, `AI-6`), conversation states, non-goals, and the manual test checklist | Before any feature work                                         |
| [`docs/TECH-STACK.md`](docs/TECH-STACK.md) | **How** to build it: libraries, versions, repo layout, architecture rules, documentation sources                                    | Before adding code, dependencies, or infrastructure             |
| [`docs/DESIGN.md`](docs/DESIGN.md)         | **How it looks**: colors, typography, motion, component variants, copy rules                                                        | Before building or changing any UI                              |
| [`CONTEXT.md`](CONTEXT.md)                 | The glossary: the exact words for domain concepts                                                                                   | Whenever you name something (UI copy, types, tables, functions) |

If these documents disagree with this file, they win. If they disagree with each other, `TECH-STACK.md` wins on implementation details and `PRD.md` wins on product behavior. If a task conflicts with a documented decision, stop and ask. Don't silently deviate.

## Your training data is out of date for this stack

Several core libraries are pre-release or newer than your training data. **Fetch the docs before writing code against them.** Don't write from memory.

- **oRPC is v2 beta** (pinned `2.0.0-beta.40`). A plain `pnpm add @orpc/...` installs **v1**. Always add with the exact version. Docs: [orpc.dev](https://orpc.dev) ([llms.txt](https://orpc.dev/llms.txt)), not v1.orpc.dev. The `orpc` / `orpc-contract` / `orpc-openapi` skills cover v2.
- **Prisma is 8 (release candidate)**, which has a new architecture (contracts, new CLI) with typed pgvector. Docs: [prisma.io/docs/orm/v8](https://www.prisma.io/docs/orm/v8). Prisma 7 knowledge doesn't carry over. The fallback is Prisma 7.10 (see TECH-STACK section 5).
- **Next.js 16**: read the bundled guides in `apps/web/node_modules/next/dist/docs/` (see `apps/web/AGENTS.md`).
- **Vercel AI SDK 7** (released June 2026): check [ai-sdk.dev](https://ai-sdk.dev/docs), since v6 examples may not match.
- **PartyKit is now Cloudflare PartyServer.** The source of truth is [github.com/cloudflare/partykit](https://github.com/cloudflare/partykit) (`partyserver`, `partysocket`), **not** partykit.io. Research current best practices before building the real-time layer.
- **Neon**: Auth (Managed Better Auth), Functions, Object Storage and AI Gateway have been GA since Sep 2026. The AI Gateway has **no embeddings**, so OpenAI is called directly for those.

## Repository layout

```
apps/web/          Next.js 16 app: dashboard, widget iframe page, oRPC handlers, agent orchestration  (Vercel)
apps/realtime/     PartyServer on Cloudflare Workers + Durable Objects
apps/functions/    Neon Functions: ingest, suggested questions, auto-close                          (not created yet)
packages/shared/   oRPC contract, Zod schemas, real-time event types, shared constants
packages/db/       Prisma 8 schema, migrations, client, workspace-scoped data access               (not created yet)
docs/              PRD.md, TECH-STACK.md
```

Workspace packages are named `@marshaldesk/<name>` and consumed as TypeScript source (`transpilePackages` in `apps/web/next.config.ts`).

## Commands

Run from the repo root (pnpm 10, Node 24):

| Command                                   | Does                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| `pnpm install`                            | Install all workspace dependencies                          |
| `pnpm dev`                                | Start the web app at http://localhost:3000                  |
| `pnpm --filter @marshaldesk/realtime dev` | Start the real-time Worker locally at http://localhost:8787 |
| `pnpm build`                              | Production build of the web app                             |
| `pnpm typecheck`                          | Type check every package                                    |
| `pnpm lint`                               | ESLint every package                                        |
| `pnpm format` / `pnpm format:check`       | Prettier write / check                                      |

Add dependencies to the package that uses them: `pnpm --filter @marshaldesk/web add <pkg>`. Root devDependencies are only for repo-wide tooling.

**Before calling any change done:** run `pnpm typecheck` and `pnpm lint`, and `pnpm build` if you touched routing, config, or dependencies. There's no automated test suite in v1. The acceptance test is the manual checklist in PRD section 9, so for agent or conversation changes, say which checklist items you exercised.

## Architecture rules (non-negotiable)

- **No server actions.** Every read and write goes through **oRPC** procedures, **contract-first**: define the contract in `packages/shared` (Zod, with OpenAPI metadata), implement it in `apps/web`, and serve it via both `RPCHandler` and `OpenAPIHandler`.
- **Data fetching:** server components prefetch through the server-side oRPC client into **TanStack Query** and hydrate. Client components use `@orpc/tanstack-query`. Follow oRPC's documented SSR setup.
- **Database access is server-side only, through Prisma, via `packages/db`.** No Neon Data API, no row-level security, no client-side queries.
- **Tenant isolation lives in code.** Every data-access function for workspace data takes `workspaceId` as a required argument. `workspaceId` comes **only** from procedure context (`ownerProcedure` via the Neon Auth session, `visitorProcedure` via the visitor token), never from client input.
- **Real time:** save to Postgres **first**, then publish to PartyKit. PartyKit only delivers messages and is never the store.
- **The agent runs after the response.** The widget's `sendMessage` saves and returns, and the pipeline (classify → embed → retrieve → answer) runs in `after()` and streams to the conversation's PartyKit room.
- **The agent is grounded:** it answers only from retrieved chunks, treats sources and visitor messages as untrusted data, and hands off instead of guessing. Off-topic messages never reach retrieval or the answer model.
- **Conversation state** is one field: `ai | waiting | human | closed`. Transitions follow PRD Flow C exactly. Use exhaustive `switch` with a `never` check on it and on every other union.

## Scope guardrails

Don't build these in v1 (full list in PRD section 3): team features (invites, roles), multiple workspaces per owner, billing, **rate limits or usage quotas** (only the safety limits in PRD L-3), email notifications, business hours, compliance tooling (consent, data notices, AI labels, retention), identified visitors, a help center, integrations, or automated agent tests. If something seems necessary but is listed as a non-goal, ask first.

Decisions intentionally left open for implementation are listed in TECH-STACK section 15 (models, DOCX, magic links, DiceBear style, PartyServer details, Prisma 8 ↔ Neon connection, the embed script bundler, `neon.ts`). Resolve them by research, then tell Jan what you picked and why.

## Code conventions

- **TypeScript strict. No `any`.** Use `unknown` and narrow, or infer types from Zod and Prisma.
- **Validate at the boundary** with Zod schemas from `packages/shared`, the same schemas for forms (React Hook Form) and API inputs.
- **Imports at the top of the file.** No inline or dynamic imports unless there's a documented reason.
- **Comments only for constraints the code can't show.** Don't narrate the code or explain your change.
- **Naming follows `CONTEXT.md`**: workspace (not organization), member and owner, visitor, conversation, agent (not bot or assistant), handoff, waiting, source (not document), knowledge base, greeting, suggested question, attachment, agent off.
- **shadcn/ui** components live in `apps/web/components/ui/`. Add them with the shadcn CLI (`pnpm dlx shadcn@latest add <name>` from `apps/web`). Don't hand-write replacements. The style is `base-nova` (Base UI primitives, so use `render` props, not Radix `asChild`).
- **Markdown** in messages renders with Streamdown.

## UI and copy

- **Never use uppercase labels with wide letter-spacing** (eyebrow-style `uppercase tracking-wider` labels). Use sentence case and default letter-spacing for all labels and meta text.
- Write product copy in plain, friendly sentence case, using glossary terms.
- The widget must be fully responsive (full-screen on phones). The dashboard is built for desktop.

## Working with Jan

- He prefers decisions presented with a recommended option, one topic at a time or in numbered rounds.
- He's pragmatic about scope: this is a showcase build, so don't push compliance, GDPR, or enterprise hardening unless asked.
- Don't add dependencies or services outside `TECH-STACK.md` without asking.
- Don't commit, push, or deploy unless asked. Development work uses the Neon `development` branch, never `production`.
