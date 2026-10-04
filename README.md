# MarshalDesk

An Intercom-style customer support app with an AI agent that knows its limits.

A business pastes one snippet into its website and gets a chat widget. Visitors talk to an AI agent that answers **only** from the business's own knowledge base. When the agent isn't sure, or the visitor asks for a person, the conversation goes to the owner in a real-time dashboard.

![The MarshalDesk inbox, showing how the agent answered a question from the knowledge base](docs/images/inbox-light.png)

MarshalDesk is built for a YouTube video. It's a fully working product, not a demo with fake data, but it doesn't have billing, team features, or enterprise hardening.

## Sponsored by Neon

Thank you to [Neon](https://neon.com) for sponsoring this video. MarshalDesk runs on Neon from end to end: Postgres with pgvector for the knowledge base, Neon Auth for sign-in, Object Storage for uploaded files, Functions for background jobs, and the AI Gateway for both the chat models and the embeddings.

**[Try Neon for free →](https://neon.com)**

## What it does

**An agent that knows its limits.** Every visitor message is classified before anything else happens:

- **Support questions** are answered from the knowledge base, streamed into the widget word by word, in the visitor's own language.
- **Off-topic messages** ("What's 5 × 5?", "write me a poem", "ignore your instructions…") get a polite refusal. They never reach retrieval or the answer model.
- **Questions the knowledge base doesn't cover**, or that the agent can't answer confidently, go to a person instead of getting a guessed answer.

**For the business owner:**

- **Knowledge base.** Upload PDF, Markdown, and TXT files, or write text sources in the dashboard. Files are parsed, chunked, and embedded in the background, and suggested questions for the widget are generated from them.
- **Live inbox.** See every conversation as it happens, take over from the agent, reply, hand the conversation back, or close it. Waiting conversations are counted in the tab title and can trigger browser notifications.
- **"How the agent handled this."** Each answer shows how the message was classified, which sources matched and how strongly, which models answered, and how long it took. You can see why the agent answered or handed off.
- **Visitor details.** Location, local time, language, device, browser, current page, and visit history, without storing the visitor's IP address.
- **Widget settings.** Agent name and avatar, greeting, color, position, and the domains allowed to embed the widget, with a live preview.
- **Light and dark mode.**

**For visitors:**

- A responsive chat widget that goes full screen on phones.
- No sign-up. Visitors keep their conversation when they reload the page.
- A button to ask for a real person at any time.

## How it's built

| Layer           | Choice                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| App             | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui                          |
| API             | oRPC v2, contract-first, served as RPC and OpenAPI, with TanStack Query               |
| Database        | Neon Postgres + pgvector, through Prisma 8                                            |
| Auth            | Neon Auth (Managed Better Auth)                                                       |
| AI              | Vercel AI SDK 7 + Neon AI Gateway (chat models and Qwen3 embeddings)                  |
| Background jobs | Neon Functions: file ingest, suggested questions, auto-closing inactive conversations |
| File storage    | Neon Object Storage                                                                   |
| Real time       | Cloudflare PartyServer (formerly PartyKit) on Workers and Durable Objects             |
| Hosting         | Vercel (web app), Cloudflare (real time), Neon (everything else)                      |

Messages are always saved to Postgres first and only then delivered in real time, so the real-time layer is never the source of truth. Every data-access function is scoped to a workspace, so one business never sees another's data.

The full details are in [`docs/TECH-STACK.md`](docs/TECH-STACK.md). The product spec is in [`docs/PRD.md`](docs/PRD.md), and the design system is in [`docs/DESIGN.md`](docs/DESIGN.md).

### Repository layout

```
apps/web/         Next.js app: dashboard, widget, API, agent pipeline
apps/realtime/    PartyServer on Cloudflare Workers + Durable Objects
apps/functions/   Neon Function for ingest, suggested questions, and auto-close
packages/shared/  oRPC contract, Zod schemas, real-time event types
packages/db/      Prisma schema, migrations, and workspace-scoped data access
neon.ts           Neon Functions, storage buckets, and triggers
```

## Running it locally

You need Node 24, pnpm 10, a [Neon](https://neon.com) project with Auth, Object Storage, Functions, and the AI Gateway enabled, and a Cloudflare account for the real-time Worker.

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Copy `apps/web/.env.example` to `apps/web/.env.local` and `apps/realtime/.dev.vars.example` to `apps/realtime/.dev.vars`, then fill them in from your Neon branch. Each variable is explained in the example files.

3. Apply the database migrations:

   ```sh
   pnpm --filter @marshaldesk/db db:migrate
   ```

4. Deploy the background jobs to your Neon branch. Update the project and branch IDs in the `functions:*` scripts in `package.json` first.

   ```sh
   pnpm functions:deploy:dev
   ```

5. Start the real-time Worker and the web app:

   ```sh
   pnpm --filter @marshaldesk/realtime dev
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000), sign up, and add a few sources to the knowledge base. Then paste the widget snippet from the dashboard into any page served from `localhost` (allowed in development) and chat with your agent.

Other useful commands are `pnpm typecheck`, `pnpm lint`, `pnpm format`, and `pnpm build`.
