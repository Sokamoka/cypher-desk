# Event Management Web App - Copilot Instructions

## Tech Stack

- **Framework:** Nuxt 4 (TypeScript, Vue 3, Composition API)
- **UI Component Library:** Nuxt UI (`UForm`, `UFormGroup`, `UInput`, `UTable`, `UModal`, `USelect`, etc.)
- **Authentication:** Better Auth (`better-auth` package) — email/password, backed by Cloudflare D1 via the Drizzle adapter
- **Validation:** Valibot (`valibot` package for client-side and server-side validation)
- **Database & ORM:** Cloudflare D1 + Drizzle ORM (`drizzle-orm/d1`)
- **Deployment Platform:** Cloudflare Pages / Workers
- **Package Manager:** pnpm

## Language & Naming Conventions (Strictly English)

- **Code Language:** ALL variable names, function names, file names, page routes, components, database column names, types, interfaces, and code comments MUST be in **English**.
- **UI Content:** UI strings, error messages, labels, and placeholders must also default to English in the codebase.

## Domain Model & Data Schema (Drizzle ORM)

- Defined in `server/database/schema.ts` using SQLite tables:
  - `user`, `session`, `account`, `verification`: Better Auth core tables (managed by the
    `drizzleAdapter`) — do not hand-roll auth/user tables outside of this schema.
  - `events`: `id` (text, PK), `userId` (FK -> `user.id`, owner), `title`, `description`,
    `date`, `slug` (unique, public link), `createdAt`
  - `eventRegistrations`: `id` (PK), `eventId` (FK -> `events.id`), `participantName`,
    `participantEmail`, `createdAt`

## Authentication & Authorization (Better Auth + Cloudflare D1)

- **Server setup (`server/utils/auth.ts`):** The Better Auth instance is NOT a module-level
  singleton. Cloudflare Workers bindings (`event.context.cloudflare.env.DB`) only exist
  per-request, so build the `betterAuth()` instance lazily inside a `getAuth(event)` function
  and cache it in a `WeakMap` keyed by the D1 binding object, so repeated requests within the
  same Worker isolate reuse it instead of reconnecting every time.
- **Drizzle adapter:** Configure with `drizzleAdapter(drizzle(db), { provider: "sqlite", schema })`
  from `better-auth/adapters/drizzle`, passing the full `* as schema` export from
  `server/database/schema.ts` so Better Auth's tables resolve correctly.
- **Auth endpoint:** `server/api/auth/[...all].ts` is a catch-all handler that delegates to
  `auth.handler(toWebRequest(event))` (from `h3`). Do not add custom logic here — all
  Better Auth routes (sign-up, sign-in, sign-out, session) go through this single handler.
- **Session validation on protected endpoints:** Every protected `server/api/**` handler
  MUST call `requireSessionUser(event)` (from `server/utils/auth.ts`) as the first line — it
  validates the session via `auth.api.getSession({ headers: event.headers })` and throws a
  `401` if there is no session. Never trust a client-supplied `userId`.
- **Strict per-user event isolation:** Every read/update/delete on `events` MUST filter or
  verify `events.userId === session.user.id`. When an event exists but belongs to another
  user, return `404` (not `403`) — never reveal that the resource exists to a non-owner.
- **Client-side (`app/utils/auth-client.ts`):** Use `createAuthClient()` from `better-auth/vue`,
  re-exporting `signIn`, `signUp`, `signOut`, `useSession` for use in pages/components.
- **Route protection (`app/middleware/auth.ts`):** Guards any route under `/dashboard/**`.
  Because the Better Auth Vue client needs an absolute URL + forwarded cookies during SSR,
  the middleware performs a manual `$fetch("/api/auth/get-session", { baseURL:
  useRequestURL().origin, headers: useRequestHeaders(["cookie"]) })` when `import.meta.server`
  is true, and falls back to `authClient.getSession()` on the client. Redirect to
  `/auth/login?redirect=<path>` when there is no session.
- **Public endpoints (`server/api/public/**`):** Must NEVER require a session, and must NEVER
  return `userId`, `participantEmail` for other participants, or any other registrant's PII. Public
  event lookups accept either the `id` or the `slug` (`where(or(eq(events.id, id),
  eq(events.slug, id)))`).
- **Env vars:** `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are read from
  `event.context.cloudflare.env` (Nitro's Cloudflare dev emulation loads `.env.local` into this
  automatically in local dev). Do not fall back to `process.env` in server code — Workers don't
  have it. In production, set `BETTER_AUTH_SECRET` via `wrangler secret put`, and
  `BETTER_AUTH_URL` via `wrangler.toml` `[vars]`.

## Architecture & Coding Standards

- **Package Management & Tooling:** Always use `pnpm` for installing packages and executing scripts (e.g., `pnpm add <pkg>`, `pnpm dev`, `pnpm dlx wrangler d1 create`). Do NOT suggest `npm`, `yarn`, `bun`, or `npx`.
- **Nuxt 4:** Follow Nuxt 4 folder structures, auto-imports, and server handlers (`defineEventHandler`).
- **Database Access:** Use the Cloudflare D1 binding via Drizzle in server endpoints: `const db = drizzle(event.context.cloudflare.env.DB)`.
- **Validation (Valibot):**
  - Define schemas in `utils/schemas.ts` using Valibot `v.object({...})`.
  - Use schemas with Nuxt UI `<UForm :schema="...">` on the frontend.
  - Validate server-side payload in `/server/api/...` using `v.parse()` or `v.safeParse()` on `readBody(event)`.
  - Infer Types using `v.InferOutput<typeof Schema>`.
- **Security & Privacy:** Public endpoints must NEVER reveal `participantEmail` from the `eventRegistrations` table, or any other user's `userId`/events. See the "Authentication & Authorization" section above for the full session/ownership rules.

## Documentation Standards

- When generating or updating documentation (like `README.md`), always include:
  - Prerequisites (Node.js, `pnpm`, Wrangler CLI, Cloudflare Account).
  - Cloudflare D1 database setup (creation via `pnpm dlx wrangler d1 create`, schema generation via Drizzle Kit).
  - Local database execution (`pnpm dlx wrangler d1 execute --local`) vs Remote migration execution (`pnpm dlx wrangler d1 execute --remote`).
  - Deployment instructions for Cloudflare Pages/Workers.
