<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web

The Next.js 16 app: dashboard, widget iframe page, oRPC handlers, and agent orchestration. **Read the root [`AGENTS.md`](../../AGENTS.md) first**, since it holds the project rules, doc map, and conventions.

- App Router in `app/`, with **no `src/` directory**. The path alias `@/*` maps to this folder.
- Server components by default. Add `"use client"` only where interactivity requires it.
- **No server actions.** Data goes through oRPC (planned: `app/rpc/[[...rest]]/route.ts` for RPC and an OpenAPI route, per `docs/TECH-STACK.md` section 4).
- The widget's chat UI is a route in this app, loaded in an iframe. The embed script has its own tiny build, separate from Next.js.
- `components/ui/` is shadcn-generated (`base-nova`, Base UI). Add components with `pnpm dlx shadcn@latest add <name>` from this folder, and don't reformat them by hand (Prettier ignores this folder).
- `lib/utils.ts` re-exports `cn` from shadcn's `cn` package.
- Workspace packages (`@marshaldesk/*`) are compiled via `transpilePackages` in `next.config.ts`. Add new ones there.
