# Event Management Web App - Copilot Instructions

## Tech Stack

- **Framework:** Nuxt 4 (TypeScript, Vue 3, Composition API)
- **UI Component Library:** Nuxt UI (`UForm`, `UFormGroup`, `UInput`, `UTable`, `UModal`, `USelect`, etc.)
- **Validation:** Valibot (`valibot` package for client-side and server-side validation)
- **Database & ORM:** Cloudflare D1 + Drizzle ORM (`drizzle-orm/cloudflare-d1`)
- **Deployment Platform:** Cloudflare Pages / Workers
- **Package Manager:** pnpm

## Language & Naming Conventions (Strictly English)

- **Code Language:** ALL variable names, function names, file names, page routes, components, database column names, types, interfaces, and code comments MUST be in **English**.
- **UI Content:** UI strings, error messages, labels, and placeholders must also default to English in the codebase.

## Domain Model & Data Schema (Drizzle ORM)

- Defined in `server/database/schema.ts` using SQLite tables:
  - `events`: `id` (text/uuid, PK), `title`, `description`, `eventDate`, `location`, `createdAt`
  - `categories`: `id` (PK), `eventId` (FK -> events.id), `name`, `maxCapacity`
  - `registrations`: `id` (PK), `eventId` (FK), `categoryId` (FK), `applicantName`, `applicantEmail`, `createdAt`
  - `users`: `id` (PK), `email`, `passwordHash`, `role` ("ADMIN")

## Architecture & Coding Standards

- **Package Management & Tooling:** Always use `pnpm` for installing packages and executing scripts (e.g., `pnpm add <pkg>`, `pnpm dev`, `pnpm dlx wrangler d1 create`). Do NOT suggest `npm`, `yarn`, `bun`, or `npx`.
- **Nuxt 4:** Follow Nuxt 4 folder structures, auto-imports, and server handlers (`defineEventHandler`).
- **Database Access:** Use the Cloudflare D1 binding via Drizzle in server endpoints: `const db = drizzle(event.context.cloudflare.env.DB)`.
- **Validation (Valibot):**
  - Define schemas in `utils/schemas.ts` using Valibot `v.object({...})`.
  - Use schemas with Nuxt UI `<UForm :schema="...">` on the frontend.
  - Validate server-side payload in `/server/api/...` using `v.parse()` or `v.safeParse()` on `readBody(event)`.
  - Infer Types using `v.InferOutput<typeof Schema>`.
- **Security & Privacy:** Public endpoints must NEVER reveal `applicantEmail` from the registrations table.

## Documentation Standards

- When generating or updating documentation (like `README.md`), always include:
  - Prerequisites (Node.js, `pnpm`, Wrangler CLI, Cloudflare Account).
  - Cloudflare D1 database setup (creation via `pnpm dlx wrangler d1 create`, schema generation via Drizzle Kit).
  - Local database execution (`pnpm dlx wrangler d1 execute --local`) vs Remote migration execution (`pnpm dlx wrangler d1 execute --remote`).
  - Deployment instructions for Cloudflare Pages/Workers.
