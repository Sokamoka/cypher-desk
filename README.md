# Event Management Web App

A modern event management application built with **Nuxt 4**, **TypeScript**, **Cloudflare D1 (SQLite)**, **Drizzle ORM**, **Better Auth**, and **Nuxt UI**. Authenticated organizers create and manage their own events; anyone with a public event link can view it and register without an account.

## Tech Stack

- **Framework:** Nuxt 4 (TypeScript, Vue 3, Composition API)
- **UI Component Library:** Nuxt UI (`UForm`, `UFormGroup`, `UInput`, `UTable`, `UModal`, `USelect`, etc.)
- **Authentication:** Better Auth (email/password, backed by Cloudflare D1 via the Drizzle adapter)
- **Validation:** Valibot (client-side and server-side validation)
- **Database & ORM:** Cloudflare D1 (SQLite) + Drizzle ORM
- **Deployment Platform:** Cloudflare Pages / Workers
- **Package Manager:** pnpm

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **pnpm** (Package Manager)

   ```bash
   npm install -g pnpm
   # Verify installation
   pnpm --version
   ```

3. **Wrangler CLI** (Cloudflare Workers CLI)
   - Installed via pnpm in the project

4. **Cloudflare Account**
   - Sign up at [dash.cloudflare.com](https://dash.cloudflare.com/)
   - Required for D1 database and Pages deployment

5. **Git** (for version control)
   - Download from [git-scm.com](https://git-scm.com/)

## Project Structure

```
├── app/                               # Nuxt srcDir (configured in nuxt.config.ts)
│   ├── app.vue
│   ├── layouts/
│   │   ├── auth.vue
│   │   ├── dashboard.vue
│   │   └── page.vue
│   ├── middleware/
│   │   └── auth.ts                    # Redirects unauthenticated users away from /dashboard
│   ├── utils/
│   │   └── auth-client.ts             # Better Auth Vue client (signIn/signUp/signOut/useSession)
│   └── pages/
│       ├── index.vue                  # Marketing home page
│       ├── auth/
│       │   ├── login.vue
│       │   └── signup.vue
│       ├── dashboard/
│       │   └── index.vue              # Protected: current user's events + create form
│       └── e/
│           └── [id].vue                # Public event page (by id or slug) + registration form
├── server/
│   ├── api/                           # Nuxt server endpoints
│   │   ├── auth/
│   │   │   └── [...all].ts            # Better Auth catch-all handler
│   │   ├── events/                    # Protected — requires a Better Auth session
│   │   │   ├── index.get.ts           # GET /api/events (current user's events only)
│   │   │   ├── index.post.ts          # POST /api/events (create, owned by current user)
│   │   │   ├── [id].get.ts            # GET /api/events/[id] (owner only)
│   │   │   ├── [id].put.ts            # PUT /api/events/[id] (owner only)
│   │   │   └── [id].delete.ts         # DELETE /api/events/[id] (owner only)
│   │   └── public/events/             # Public — no auth required
│   │       ├── [id].get.ts            # GET /api/public/events/[id] (by id or slug)
│   │       └── [id]/register.post.ts  # POST /api/public/events/[id]/register
│   ├── utils/
│   │   ├── auth.ts                    # Per-request Better Auth instance + requireSessionUser()
│   │   └── slug.ts                    # Public event slug generation
│   └── database/
│       └── schema.ts                  # Drizzle ORM SQLite schema (Better Auth + events + registrations)
├── utils/
│   └── schemas.ts                    # Valibot validation schemas
├── drizzle.config.ts                  # Drizzle Kit configuration
├── nuxt.config.ts                     # Nuxt configuration
├── tsconfig.json                      # TypeScript config (extends .nuxt/tsconfig.json)
├── package.json
├── pnpm-lock.yaml
└── README.md                         # This file
```

## Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/Sokamoka/cypher-desk.git
cd cypher-desk
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies including:

- Nuxt 4 and Vue 3
- Drizzle ORM
- Valibot
- Nuxt UI
- Wrangler CLI

### 3. Configure Environment

Create a `.env.local` file in the project root (if not already present):

```env
# Cloudflare D1 Database (accessed via event.context.cloudflare.env.DB, no vars needed)

# Better Auth
# Generate a strong secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BETTER_AUTH_SECRET=<your-generated-secret>
BETTER_AUTH_URL=http://localhost:3456
```

> **Note:** Cloudflare D1 is automatically bound to your Nuxt server handlers via the `event.context.cloudflare.env.DB` object. Nitro's Cloudflare dev emulation also loads `.env.local` into `event.context.cloudflare.env`, so `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` are available the same way in both local dev and production. For production, set `BETTER_AUTH_SECRET` with `wrangler secret put BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` via `wrangler.toml` `[vars]`.

## Cloudflare D1 Database Setup

### Step 1: Create Remote D1 Database (Required Once)

In current Wrangler versions, `wrangler d1 create` only creates a remote database.
You must create a remote DB first and add its binding in Wrangler config.

```bash
# Create a remote D1 database on Cloudflare
pnpm dlx wrangler d1 create cypher-desk

# Follow the prompts and note the database ID
# Create wrangler.toml if it does not exist, then add:
# name = "cypher-desk"
# compatibility_date = "2026-08-05"
# [[d1_databases]]
# binding = "DB"
# database_name = "cypher-desk"
# database_id = "<YOUR_DATABASE_ID>"
```

### Step 2: Initialize Local D1 State (Wrangler v4+)

After adding the D1 binding in Wrangler config, initialize and use the local DB with `--local`:

```bash
# Initialize local D1 state (creates local DB files if missing)
pnpm dlx wrangler d1 execute cypher-desk --local --command="SELECT 1;"

# Local DB files are stored under .wrangler/state/ by default
```

## Database Schema & Migrations

### Generate Migrations from Schema

After modifying `server/database/schema.ts`, generate migrations:

```bash
pnpm drizzle-kit generate
```

This creates SQL migration files in `server/database/migrations/`.

### Apply Migrations Locally

To run migrations on your local D1 database:

```bash
# Generate SQL from schema
pnpm drizzle-kit generate

# Read the migration file and apply to local database
pnpm dlx wrangler d1 execute cypher-desk --local --file=./server/database/migrations/<migration_file>.sql
```

Or for all migrations:

```bash
# Apply all pending migrations to local D1
for file in server/database/migrations/*.sql; do
  pnpm dlx wrangler d1 execute cypher-desk --local --file="$file"
done
```

### Apply Migrations to Remote Database (Production)

```bash
# Apply migrations to your remote Cloudflare D1 database
pnpm dlx wrangler d1 execute cypher-desk --remote --file=./server/database/migrations/<migration_file>.sql
```

Or all migrations:

```bash
# Apply all pending migrations to remote D1
for file in server/database/migrations/*.sql; do
  pnpm dlx wrangler d1 execute cypher-desk --remote --file="$file"
done
```

### Verify Database Schema

Check the database schema locally:

```bash
# Connect to local D1 database
pnpm dlx wrangler d1 execute cypher-desk --local --command="SELECT name FROM sqlite_master WHERE type='table';"
```

For remote:

```bash
# Check remote database
pnpm dlx wrangler d1 execute cypher-desk --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## Local Development

### Start Development Server

```bash
pnpm dev
```

This starts:

- Nuxt dev server (default: http://localhost:3000)
- Hot module replacement (HMR)
- Cloudflare D1 local bindings

### Access Application

- **Home:** http://localhost:3456/
- **Sign up / Login:** http://localhost:3456/auth/signup, http://localhost:3456/auth/login
- **Dashboard (protected):** http://localhost:3456/dashboard
- **Public Event Page:** http://localhost:3456/e/{id-or-slug}

### Development Workflow

1. **Sign up and create an event:**
   - Navigate to http://localhost:3456/auth/signup and create an account
   - You're redirected to `/dashboard`; use "Create Event" to add an event
   - Each event gets a public slug shown in the table (e.g. `/e/my-event-ab12cd`)

2. **Public registration:**
   - Open the event's public link from another browser/incognito session (no login required)
   - Fill in the registration form (`participantName`, `participantEmail`)

3. **Strict user isolation:**
   - Sign up as a second user — their `/dashboard` only shows their own events
   - `GET/PUT/DELETE /api/events/{id}` return `404` (not `403`) for events owned by another user, to avoid leaking existence

4. **API Testing:**
   - Your events (session required): `GET http://localhost:3456/api/events`
   - Create event (session required): `POST http://localhost:3456/api/events`
   - Public event details: `GET http://localhost:3456/api/public/events/{id-or-slug}`
   - Public registration: `POST http://localhost:3456/api/public/events/{id-or-slug}/register`

## Building for Production

### Build Nuxt Application

```bash
pnpm build
```

This generates:

- `.output/` directory with production-ready code
- Optimized bundles
- Server handlers for Cloudflare

### Build Output Structure

```
.output/
├── server/          # Nuxt server files
├── public/          # Static assets
└── README.md        # Build info
```

## Deployment to Cloudflare Pages/Workers

### 1. Connect GitHub Repository

```bash
# Push your code to GitHub
git push origin main

# Then in Cloudflare Pages dashboard:
# 1. Go to Pages
# 2. Connect to Git repository
# 3. Select this repository
```

### 2. Configure Build Settings

In Cloudflare Pages dashboard:

- **Build command:** `pnpm run build`
- **Build output directory:** `.output/public`
- **Node version:** 18+

### 3. Set Environment Variables (if needed)

In Pages settings, add environment variables:

- D1 databases are automatically bound via `wrangler.toml`

### 4. Deploy

```bash
# Push to GitHub and Cloudflare automatically deploys
git push origin main
```

Or deploy manually using Wrangler:

```bash
# Deploy to Cloudflare Workers
pnpm dlx wrangler deploy
```

## Database Schema

### Better Auth Tables (`user`, `session`, `account`, `verification`)

Managed by the Better Auth Drizzle/D1 adapter — see `server/database/schema.ts` for the full
field list. These back email/password authentication; `events.userId` references `user.id`.

### Events Table

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Event Registrations Table

```sql
CREATE TABLE event_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Protected Endpoints (require a Better Auth session)

All routes under `/api/events/*` validate the session via `requireSessionUser()`
(`server/utils/auth.ts`) and strictly scope reads/writes to `events.userId === session.user.id`.
Accessing or modifying another user's event returns `404` (not `403`), to avoid leaking whether
the event exists.

#### List Current User's Events

```
GET /api/events

Response:
{
  "success": true,
  "events": [
    {
      "id": "event_xxx",
      "userId": "usr_xxx",
      "title": "Sample Event",
      "description": "Event details",
      "date": "2026-08-10T14:00",
      "slug": "sample-event-ab12cd",
      "createdAt": "2026-08-05T22:00:00Z"
    }
  ],
  "total": 1
}
```

#### Create Event

```
POST /api/events

Request:
{
  "title": "New Event",
  "description": "Event description",
  "date": "2026-08-10T14:00"
}

Response:
{
  "success": true,
  "eventId": "event_xxx",
  "slug": "new-event-ab12cd",
  "message": "Event created successfully"
}
```

#### Get / Update / Delete a Single Event (owner only)

```
GET    /api/events/{id}
PUT    /api/events/{id}
DELETE /api/events/{id}
```

### Public Endpoints (no authentication)

#### Get Public Event Details

```
GET /api/public/events/{id-or-slug}

Response:
{
  "success": true,
  "event": {
    "id": "event_xxx",
    "title": "Sample Event",
    "description": "Event details",
    "date": "2026-08-10T14:00",
    "slug": "sample-event-ab12cd"
  }
}
```

Note: the public payload never includes `userId` or registration/participant data.

#### Submit Registration

```
POST /api/public/events/{id-or-slug}/register

Request:
{
  "participantName": "John Doe",
  "participantEmail": "john@example.com"
}

Response:
{
  "success": true,
  "message": "Registration submitted successfully"
}
```

Note: the response never echoes back `participantEmail` or any other participant's data.

## Troubleshooting

### D1 Database Connection Issues

```bash
# Check if D1 is properly configured
pnpm dlx wrangler d1 list

# Test local database connection
pnpm dlx wrangler d1 execute cypher-desk --local --command="SELECT 1;"
```

### Migration Failures

```bash
# View local database schema
pnpm dlx wrangler d1 execute cypher-desk --local --command=".schema"

# Clear local database (caution: destructive)
rm -rf .wrangler/state/v3/d1/
```

### Drizzle Kit Issues

```bash
# Regenerate migrations
pnpm drizzle-kit generate

# Validate schema
pnpm drizzle-kit validate
```

## Language & Naming Conventions

All code strictly follows English conventions:

- Variable names, function names, file names in **English**
- Database column names in **English**
- Code comments in **English**
- UI strings default to **English**

## Security & Privacy

### Important Security Notes

1. **Email Privacy:** Participant emails are NEVER returned in public API responses (e.g. the public event details endpoint, or the registration confirmation response)
2. **Strict User Isolation:** Every `/api/events/*` handler validates the Better Auth session and scopes reads/writes to `events.userId === session.user.id`; cross-user access returns `404`, not `403`
3. **Validation:** All inputs are validated server-side using Valibot schemas
4. **Database:** D1 is SQLite - ensure database file is not exposed in version control

### Environment Variables

- Never commit `.env.local` or sensitive credentials
- `BETTER_AUTH_SECRET` must be set via `wrangler secret put BETTER_AUTH_SECRET` for production (never commit the real value to `wrangler.toml`)
- Use Cloudflare dashboard/`wrangler.toml` `[vars]` for non-secret production config like `BETTER_AUTH_URL`
- D1 binding is automatically available in `event.context.cloudflare.env.DB`

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:

1. Check existing [GitHub Issues](https://github.com/Sokamoka/cypher-desk/issues)
2. Review the [Documentation Standards](.github/copilot-instructions.md)
3. Create a new issue with detailed description

## Quick Reference

### Essential Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Generate database migrations
pnpm drizzle-kit generate

# Create remote D1 database (required once)
pnpm dlx wrangler d1 create cypher-desk

# Initialize local D1 state
pnpm dlx wrangler d1 execute cypher-desk --local --command="SELECT 1;"

# Apply migrations locally
pnpm dlx wrangler d1 execute cypher-desk --local --file=./server/database/migrations/<file>.sql

# Deploy to Cloudflare
pnpm dlx wrangler deploy
```

---

**Last Updated:** 2026-08-06  
**Version:** 1.0.0
