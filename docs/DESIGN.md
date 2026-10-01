# MarshalDesk: Design system

|                 |                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Status          | Draft, based on the landing page (Sep 27, 2026)                                                                       |
| Owner           | Jan Marshal                                                                                                           |
| Companion docs  | [`PRD.md`](./PRD.md) (what), [`TECH-STACK.md`](./TECH-STACK.md) (how), [`CONTEXT.md`](../CONTEXT.md) (words)          |
| Source of truth | Tokens: `apps/web/app/globals.css`. Components: `apps/web/components/ui/` (shadcn) and `apps/web/components/landing/` |

> **For coding agents:** this document explains the visual language and the rules behind it. The token _values_ live in `globals.css`. If the two disagree, the code wins, so update this file in the same change.

---

## 1. Principles

1. **One composition, no clutter.** A screen does one job. The landing page is one viewport: header, hero, stats. No cards in the hero, no competing sections.
2. **Build on the foundation.** Every control is a shadcn/ui component (Base UI primitives). When something needs a new look, add a `cva` variant or a prop to the shadcn component. Never hand-write a replacement.
3. **Soft, not heavy.** Light shadows (`shadow-soft`), pill shapes, and a single white glow for the primary action. No hard borders on marketing surfaces.
4. **The three dots.** Three small dots are the brand motif: in the logo mark (a chat bubble with three dots) and as the active indicator under navigation links. Reuse it for "current" or "typing" states instead of inventing new indicators.
5. **Honest copy.** MarshalDesk's promise is an agent that knows its limits, and the design should follow it. No invented customer logos, user counts, or uptime numbers. Every stat must be something the product actually does (see PRD section 3).
6. **Motion reveals, it doesn't perform.** Entrances are short and staggered. Nothing loops except the background video. Everything respects `prefers-reduced-motion`.

---

## 2. Surfaces

MarshalDesk has two visual contexts that share one token system.

| Surface                      | Theme                                                                                                                                 | Where                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Marketing** (landing page) | Always dark: black page, full-bleed looping video, white and ink pills                                                                | `app/page.tsx`, `components/landing/` |
| **Auth**                     | Always dark, like marketing: black page, ink pill controls, glow primary button, video panel                                          | `app/auth/`, `components/auth/`       |
| **App** (dashboard, widget)  | shadcn `neutral` theme, light and dark (`next-themes`, follows the system by default; toggle in the dashboard header), built for work | `app/dashboard/`, widget route        |

The marketing tokens (`ink`, `glow`, and so on) are available everywhere, so the widget and dashboard can borrow them (for example the ink pill for a primary nav action), but the app surfaces default to the standard shadcn tokens (`primary`, `muted`, `border`, …).

---

## 3. Color

All colors are CSS variables in `:root` in `globals.css`, exposed to Tailwind through `@theme inline`. Use the Tailwind class, never a raw hex in components.

### Marketing palette

| Token              | Value                   | Tailwind                 | Used for                                                      |
| ------------------ | ----------------------- | ------------------------ | ------------------------------------------------------------- |
| black              | `#000000`               | `bg-black`               | Page background behind the video                              |
| white              | `#ffffff`               | `text-white`, `bg-white` | Headline, stat values, nav pill, logo disc, primary CTA       |
| `--ink`            | `#28282a`               | `bg-ink`                 | Dark pills: sign in, burger, trust ring and pill, auth inputs |
| `--ink-hover`      | `#323234`               | `bg-ink-hover`           | Hover state of ink pills                                      |
| `--ink-foreground` | `#c8c8c8`               | `text-ink-foreground`    | Text on ink pills                                             |
| `--ink-line`       | `rgb(255 255 255 / .4)` | `border-ink-line`        | 1px hairline around ink rings and pills                       |
| `--ink-muted`      | `#c4c2c3`               | `text-ink-muted`         | Secondary text on ink (trust pill)                            |
| `--nav-foreground` | `#2e2e2e`               | `text-nav-foreground`    | Links inside the white nav pill                               |
| `--hero-subhead`   | `#d0d0d0`               | `text-hero-subhead`      | Hero subhead (rendered at 80% opacity)                        |
| `--stat-label`     | `#8e8e8e`               | `text-stat-label`        | Muted labels under stats                                      |
| overlay            | `rgb(0 0 0 / .62)`      | `bg-black/62`            | Mobile menu backdrop (with 6px blur)                          |

### App palette

The standard shadcn `neutral` set (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-*`, `sidebar-*`) in OKLCH, light in `:root` and dark in `.dark`. Don't edit these by hand. Change them through a shadcn theme update.

**Rules**

- The marketing and auth palette is monochrome on purpose. Color comes from the background video. Don't add brand hues there. The dashboard has color with a job (see "Dashboard pages"): the owner's widget color as the accent, and status colors.
- Text on the video must stay white or near-white. Put muted text (`stat-label`) only where the video is dark (the bottom of the page).

---

## 4. Typography

| Role        | Family                 | Loaded via                                              | Tailwind              |
| ----------- | ---------------------- | ------------------------------------------------------- | --------------------- |
| UI and body | **Geist** (Geist Sans) | `next/font/google` in `app/layout.tsx` → `--font-sans`  | `font-sans` (default) |
| Display     | **Geist Pixel**        | `next/font/google` in `app/layout.tsx` → `--font-pixel` | `font-display`        |
| Code        | Geist Mono             | `next/font/google` → `--font-geist-mono`                | `font-mono`           |

### Scale (marketing)

| Element    | Size                                              | Weight | Tracking                                      | Leading            |
| ---------- | ------------------------------------------------- | ------ | --------------------------------------------- | ------------------ |
| Headline   | `clamp(30px, 10.2vw, 80px)`                       | 400    | `-0.04em`, `-0.03em` ≤720px, `-0.04em` ≤420px | 1.12 / 1.05 / 1.04 |
| Subhead    | `clamp(13.5px + 2pt, 1.55vw + 2pt, 16.5px + 2pt)` | 400    | default                                       | 1.55               |
| Stat value | `clamp(18px, 2.2vw, 26px)`, `tabular-nums`        | 500    | `-0.025em`                                    | normal             |
| Stat glyph | `clamp(22px, 3vw, 33px)`, display font            | 400    | default                                       | 1                  |
| Nav link   | `clamp(13px, 1.4vw, 15px)`                        | 500    | `-0.01em`                                     | normal             |
| CTA        | `clamp(13.5px, 1.5vw, 14.5px)`                    | 600    | default                                       | normal             |
| Trust pill | `clamp(12px, 1.4vw, 13.5px)`, 12px on mobile      | 500    | default                                       | normal             |
| Stat label | `clamp(11px, 1.2vw, 12.5px)`                      | 400    | default                                       | normal             |

**Rules**

- **One font family.** Everything is Geist: Geist Sans for UI, Geist Pixel for display, Geist Mono for code. Don't add other families.
- Geist Pixel is for display moments only: the hero headline, stat glyphs, the headline on the auth video panel, dashboard page titles (the `h1` of a page), and the agent name in the widget header. Never for labels, eyebrows, body text, buttons or anything small. It loses legibility below about 18px and would turn every label into noise. Never use it for body text, buttons, or anything in the dashboard or widget.
- The headline is solid white. No gradients, shimmer, or scan effects.
- Headline lines are fixed (`whitespace-nowrap`, one `<span>` per line). Keep each line short enough to fit at 375px.
- Sentence case for all copy, including headlines, buttons and labels. **Never** use uppercase labels with wide letter-spacing (see `AGENTS.md`).

---

## 5. Layout and spacing

| Item             | Value                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Landing page     | `h-dvh`, `overflow-hidden`, flex column: header (shrink 0), hero (flex 1, centered), stats (shrink 0) |
| Page padding     | `clamp(16px, 2.4vh, 28px)` vertical, `clamp(14px, 3vw, 32px)` horizontal                              |
| Header max width | 720px, gap `clamp(18px, 2.8vw, 28px)`; nav pill max 430px                                             |
| Hero max width   | 900px; subhead max `min(500px, 92%)`                                                                  |
| Stats max width  | 920px, 4 columns (2 × 2 on mobile)                                                                    |

### Breakpoints

Defined in `@theme` in `globals.css`, next to Tailwind's defaults.

| Name          | Min width                     | Meaning                                                                                          |
| ------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `xs`          | 421px                         | `max-xs:` targets small phones (≤420px): tighter headline and trust row                          |
| `nav`         | 721px                         | Desktop header. Below it (`max-nav:`), the nav collapses into the burger menu and stats go 2 × 2 |
| height ≤700px | `[@media(max-height:700px)]:` | Tightens hero spacing on short laptop screens                                                    |

---

## 6. Shape and elevation

| Token                | Value                                     | Used for                                                         |
| -------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `rounded-full`       | 999px                                     | Every marketing control: pills, logo disc, avatars, burger       |
| `rounded-[28px]`     | 28px                                      | Mobile menu sheet                                                |
| `--radius`           | `0.625rem`                                | App surfaces (shadcn default scale `rounded-sm` … `rounded-4xl`) |
| `shadow-soft`        | `0 4px 14px rgb(0 0 0 / .16)`             | Logo disc, nav pill, ink pills                                   |
| `shadow-glow`        | 1px white ring + 22px and 44px white glow | Primary CTA only                                                 |
| `shadow-glow-strong` | Stronger version of the glow              | Primary CTA hover                                                |
| `shadow-sheet`       | `0 20px 60px rgb(0 0 0 / .45)`            | Mobile menu sheet                                                |

The glow is reserved for **one** primary action per screen.

---

## 7. Motion

All animations are Tailwind theme tokens (`--animate-*` with `@keyframes` inside `@theme`), so they're used as utilities: `animate-reveal`, `animate-headline`, and so on. The easing is `ease-out-expo` (`cubic-bezier(0.22, 1, 0.36, 1)`).

| Utility                | Effect                                             | Duration | Used for                  |
| ---------------------- | -------------------------------------------------- | -------- | ------------------------- |
| `animate-slide-down`   | Fade in from 18px above                            | 0.7s     | Header                    |
| `animate-reveal`       | Fade in from 22px below, scale 0.98, blur 6px      | 0.85s    | Trust row, subhead, stats |
| `animate-headline`     | Fade in from 14px below                            | 0.85s    | Each headline line        |
| `animate-reveal-pulse` | Reveal that overshoots to scale 1.03, then settles | 1.1s     | Primary CTA               |
| `animate-overlay-in`   | Fade in                                            | 0.28s    | Mobile menu backdrop      |
| `animate-menu-in`      | Fade in from 12px above, scale 0.97                | 0.38s    | Mobile menu sheet         |
| `animate-link-in`      | Fade in from 8px below                             | 0.4s     | Mobile menu links         |

**Choreography.** Delays are set per element with `[animation-delay:…]` or an inline `animationDelay`: header 0s, trust row 0.05s, headline lines 0.12s and 0.3s, subhead 0.28s, CTA 0.4s, stats 0.5s + 0.08s each. Stat values count up with an ease-out cubic curve once they're 25% visible.

**Rules**

- Every animated element also gets `motion-reduce:animate-none`, which shows its final state. The stats count-up jumps straight to the final value.
- Animate `opacity`, `transform`, and `filter` only. Hover lifts use the separate `translate`/`scale` properties so they don't fight the entrance keyframes.
- Hover feedback is small: a 1–2px lift, a 2–4% scale, or an opacity change.

---

## 8. Components

Add components with the shadcn CLI from `apps/web` (`pnpm dlx shadcn@latest add <name>`). The style is `base-nova` (Base UI), so compose with the `render` prop, not `asChild`. For a link that looks like a button: `<Button nativeButton={false} render={<Link href="…" />}>`.

### Button (`components/ui/button.tsx`)

Extended with marketing variants and sizes:

| Variant          | Look                                                                                                                                                                          | Use                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `glow`           | White pill, black semibold text, white glow; lifts and scales on hover                                                                                                        | The one primary CTA                                       |
| `ink`            | `ink` pill, `ink-foreground` text, soft shadow; lightens and lifts on hover                                                                                                   | Sign in, burger, secondary pills                          |
| `form-primary`   | White glow button for forms: keeps the glow, no hover lift or grow, presses to 0.97 in 150ms. Sits above neighbours (`z-10`) so its glow isn't clipped by the field separator | The one primary action on an auth form                    |
| `form-secondary` | `ink` button without the hover lift, same press feedback                                                                                                                      | Google, magic link, and other secondary form actions      |
| `form-ghost`     | Muted icon button that lights up on hover                                                                                                                                     | Inline field actions, like the password visibility toggle |
| `nav`            | Text at 50% opacity (75% on hover, 100% when current); three-dot indicator on `aria-current="page"`                                                                           | Links inside the nav pill and mobile menu                 |

| Size        | Value                                                  |
| ----------- | ------------------------------------------------------ |
| `pill`      | Height `clamp(44px, 5.2vw, 48px)`, full radius         |
| `cta`       | Fluid padding for the hero CTA                         |
| `icon-pill` | 48 × 48 circle                                         |
| `field`     | 48px tall, `rounded-lg`, matches `Input variant="ink"` |

The standard shadcn variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) remain the defaults for the app.

### Avatar and AvatarGroup (`components/ui/avatar.tsx`)

The trust row is an `AvatarGroup` of `Avatar`s, each an `ink` ring (1px `ink-line` border, 5px padding) around a white `AvatarFallback` with a black Lucide icon. Size comes from a `--trust-size` variable (`clamp(36px, 4.5vw, 42px)`, 34px ≤420px), and items overlap by `0.42 × --trust-size` with `-space-x-*`. The row ends with a `Badge` pill that tucks under the last avatar.

### Badge (`components/ui/badge.tsx`)

`outline` variant restyled as an `ink` pill for short, factual claims (the trust pill).

### Dialog (`components/ui/dialog.tsx`)

`DialogContent` takes an `overlayClassName` prop so a dialog can style its own backdrop. The mobile menu uses it: a white sheet (28px radius) under the header, over a blurred 62% black backdrop. Base UI provides focus trapping, Escape, and outside-click dismissal. The header sits at `z-60` so the burger stays above the backdrop and morphs into an X (`group-data-popup-open/button:`).

### Landing components (`components/landing/`)

| File                   | Role                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| `content.tsx`          | All landing copy, links, stats, and the video URL. Change copy here only |
| `background-video.tsx` | Full-bleed muted, looping, inline video behind everything                |
| `site-header.tsx`      | Logo disc, nav pill, sign in                                             |
| `mobile-menu.tsx`      | Burger and menu sheet (client component)                                 |
| `hero.tsx`             | Trust row, headline, subhead, CTA                                        |
| `trust-row.tsx`        | Avatar group and trust pill                                              |
| `stats.tsx`            | Four stats with count-up (client component)                              |

### Auth shell (`app/auth/layout.tsx`, `components/auth/`)

Auth follows the marketing look, not the app theme: the layout wraps everything in `dark` on a black page, so it's dark regardless of the system setting. Two columns on `lg` and up. Left: the landing's white logo disc with "MarshalDesk" (linking to `/`) at the top, and the page's form centered in a card (`max-w-[400px]`, `rounded-2xl`, 1px `white/10` border, `bg-background`, `shadow-sheet`). Right: a 12px-inset panel (`rounded-2xl`) holding the looping video, a bottom scrim for legibility, the landing `TrustRow`, and a Geist Pixel `h2` (copy in `authShowcase` in `landing/content.tsx`). Below `lg` it's a single column and the panel isn't rendered at all: `BackgroundVideo` takes a `media` query and only mounts the `<video>` through `MediaQueryGate` while it matches, so phones never download it. The layout persists across auth pages; only the form changes. Entrances reuse `animate-slide-down` (logo), `animate-reveal` (card, subhead) and `animate-headline` (headline lines).

Every form uses the block's pattern: `FieldGroup`, a centered `AuthHeading` (title plus one muted line), `Field` with `FieldLabel` and `FieldError`, then `rounded-lg` controls: `Input variant="ink"` (48px, `rounded-lg`, `ink` fill, `white/10` hairline, white focus ring), a full-width `SubmitButton` (`form-primary`, `field` size, the one primary action), and `form-secondary` buttons for secondary actions such as Google. `FieldSeparator` "Or continue with" and a `FieldDescription` footer link close the form. Server errors show in a centered `FormAlert` in `text-destructive`. Codes use `CodeInput`, a composition of shadcn `InputOTP` (two groups of three `size-12` `rounded-lg` slots, digits only), with `ResendCode`, a link that counts down a 60-second cooldown.

### Dashboard shell (`app/dashboard/layout.tsx`, `components/dashboard/`)

Based on the shadcn `dashboard-01` block, cut down to the shell: `SidebarProvider` (open state read from the `sidebar_state` cookie on the server), an `inset` sidebar with `collapsible="icon"`, and `SidebarInset` with `SiteHeader` (sidebar toggle, separator, page title, theme toggle). Collapsed, the sidebar stays as a 60px rail with 44px buttons and 20px icons: the logo tile, the nav icons (with tooltips) and the user's avatar as a button that still opens the account menu. `SidebarRail` toggles it by dragging or clicking the edge. The header is the `LogoMark` on a `bg-foreground` `rounded-lg` tile plus "MarshalDesk". Navigation is `NavMain` with Lucide icons and an active state from the path. The footer is `NavUser`: avatar (uploaded photo, then Google picture, then a DiceBear `notionists-neutral` avatar; initials as the fallback), name and email, and a menu with a header and "Sign out".

### Dashboard pages

The dashboard keeps the light and dark themes, but uses the same language as the landing and auth pages: soft `ring-1 ring-foreground/10` surfaces instead of hard borders, `rounded-lg` controls and `rounded-xl` surfaces, sentence-case labels, monochrome color, and the three-dot motif for progress and chrome.

- **Accent.** `DashboardAccentProvider` takes the owner's widget color and sets `--brand`, and points `--primary` and `--ring` at it, so default buttons, switches, focus rings, the active nav item, the setup steps and the owner's message bubbles all follow it. Changing the color on the widget page recolors the dashboard right away. The page gets a soft wash of it at the top; panels stay neutral. Colors come from the owner's choice, never from us: don't hard-code blue.
- **Status.** `waiting` is the only filled state badge, in the accent color, so what needs the owner stands out without adding hues. Panels stay neutral: never tint a panel with the accent. Source statuses on the widget page use green (ready), amber (processing) and red (failed), and only there.
- **Avatars.** Members use DiceBear `notionists-neutral`, the agent `glass` tinted with the accent, and visitors `thumbs` seeded by their id, so the three read apart.
- **Page header.** `h1` in `text-2xl font-semibold tracking-[-0.03em]` with one muted line, inside `px-4 py-6 lg:px-6 lg:py-8`.
- **Settings sections** (`settings-section.tsx`). A `SettingsSection` is an `h2` with a muted line above one card with divided rows. Each `SettingsRow` puts the label and a short description on the left and the control on the right (stacked on narrow screens). Prefer this over one card per field.
- **Knowledge base page** (`app/dashboard/knowledge`, `components/knowledge/`). Its own sidebar item between Home and Inbox: the page header with a one-line agent status, the dropzone, and divided source rows. Each row has a file icon tagged with its type (`pdf`, `md`, `txt`, lowercase) or a text icon, the name (a button that opens the chunk viewer once the source has chunks), a meta line, the status badge and icon actions.
- **Icon buttons** (`dashboard/icon-button.tsx`). Every icon-only button uses `IconButton`, whose label is both the accessible name and a tooltip.
- **Setup progress** (`widget-settings/setup-progress.tsx`). Three steps that link to their section, three dots that fill as steps are done, and the next step highlighted.
- **Dropzone** (`dropzone.tsx`). One drag-and-drop file picker for the knowledge base sources (PDF, Markdown, text, 10 MB) and, in its `compact` form, the agent avatar. It validates type and size and reports rejections by file name.
- **Code block** (`code-block.tsx`). Snippets are formatted over several lines, with line numbers, monochrome syntax colors and a copy button, on an `ink` surface in both themes.
- **Layout.** The widget page is a fixed 25rem preview column beside a settings column that takes the rest. The split only happens when the page itself is wide enough (container query, not viewport), so an open sidebar never squeezes the settings. Rows stack the same way.
- **Widget accent colors.** Every accent keeps white text at WCAG AA (4.5:1), so green and orange use their 700 shades (`#15803d`, `#c2410c`). Never pair an accent with dark text.
- **Suggested questions** (widget). One `rounded-xl` card under the greeting, on the agent's side, with divided rows: the question on the left and a small arrow in the accent on the right. No pills: two-line questions just make a row taller.
- **Widget preview.** The real widget inside a browser frame: three dots, the first allowed domain as the address, and grey blocks standing in for the customer's page. The widget itself uses `rounded-xl` surfaces, `rounded-lg` controls, and a header with the agent's status line.
- **Inbox** (`components/inbox/`). Three separate `rounded-xl` cards on the page background, like the settings sections: the list, the conversation and the details, with the gaps between them as the resize handles. List rows are divided, with a visitor avatar, an unread dot in the accent, and the state badge; the selected row is `muted`. Bubbles are `rounded-xl`: visitor on `muted`, the agent outlined in the accent (`border-primary/45` on a faint `bg-primary/8`, so it never reads as the owner's own reply), and the owner on solid `primary`. Under each agent reply, "Answered from" lists the knowledge base sources it used as small muted tags. Each tag opens that source's chunks. Under each visitor message the agent handled, a quiet "How the agent handled this" disclosure opens a muted panel with the classification, the outcome in plain words, the retrieved matches with score bars (used or below threshold), and the models, timings and tokens. Details are divided rows under a visitor header, and the composer sits at the bottom of the conversation card.

### Logo (`components/brand/logo-mark.tsx`)

An SVG chat bubble with three dots, drawn in `currentColor`. The dots are white by default; set `--logo-dots` where the bubble turns light (the app surfaces use `var(--background)` or `var(--sidebar)`, so the mark inverts in dark mode). On marketing it sits at 72% inside a white disc with `shadow-soft`. It's a placeholder mark until a final logo exists.

### Icons

Lucide only (`lucide-react`, the shadcn default). No icon fonts, no brand icon packs.

---

## 9. Voice and copy

- Use the words from `CONTEXT.md`: **agent** (never bot or assistant), **visitor**, **knowledge base**, **conversation**, **handoff**, **widget**, **workspace**.
- Sentence case, plain and friendly: "Get started", "Sign in", "How it works".
- Lead with the owner's win: **time back**. The agent answers visitors around the clock so the owner doesn't have to sit in the dashboard, and only brings them in when it isn't sure. Grounding (answers only from the knowledge base) is the supporting trust point, not the headline.
- Stats and claims must be true today. Current landing stats: under 10 minutes from sign-up to a live widget (PRD goal 1), 100% of messages classified first (PRD Flow B), answers 24/7, one snippet to install.

---

## 10. Open items

- **Background video hosting.** The video is served from a third-party CloudFront URL. Move it to our own object storage before launch, and add a poster image.
- **Logo.** `LogoMark` is a placeholder.
- **Nav targets.** Product, How it works, and Contact point to anchors that don't exist yet.
