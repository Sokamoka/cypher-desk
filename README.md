# Event Management Web App

A modern event management application built with **Nuxt 4**, **TypeScript**, **Cloudflare D1 (SQLite)**, **Drizzle ORM**, and **Nuxt UI**. Manage events and registrations with a public listing, registration form, and admin dashboard.

## Tech Stack

- **Framework:** Nuxt 4 (TypeScript, Vue 3, Composition API)
- **UI Component Library:** Nuxt UI (`UForm`, `UFormGroup`, `UInput`, `UTable`, `UModal`, `USelect`, etc.)
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
│   │   └── default.vue
│   └── pages/
│       ├── index.vue                  # Home (redirects to /events)
│       ├── events/
│       │   ├── index.vue              # Events listing page
│       │   └── [id].vue               # Event details & registration
│       └── admin/
│           ├── index.vue              # Admin dashboard
│           └── events/
│               └── create.vue         # Admin create event
├── server/
│   ├── api/                           # Nuxt server endpoints
│   │   ├── events/
│   │   │   ├── index.get.ts           # GET /api/events (list all)
│   │   │   ├── index.post.ts          # POST /api/events (create)
│   │   │   └── [id].get.ts            # GET /api/events/[id] (single event)
│   │   └── registrations/
│   │       ├── index.get.ts           # GET /api/registrations (list all)
│   │       ├── index.post.ts          # POST /api/registrations (create)
│   │       ├── [id].put.ts            # PUT /api/registrations/[id] (update)
│   │       └── [id].delete.ts         # DELETE /api/registrations/[id]
│   └── database/
│       └── schema.ts                  # Drizzle ORM SQLite schema
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
# Cloudflare D1 Database (will be configured in wrangler.toml)
# No additional env vars needed for D1 - it's accessed via event.context.cloudflare.env.DB
```

> **Note:** Cloudflare D1 is automatically bound to your Nuxt server handlers via the `event.context.cloudflare.env.DB` object.

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

- **Public Site:** http://localhost:3000/events
- **Admin Dashboard:** http://localhost:3000/admin
- **Create Event:** http://localhost:3000/admin/events/create

### Development Workflow

1. **View Public Events:**
   - Navigate to http://localhost:3000/events
   - Click on any event to see details
   - Fill registration form to test POST endpoint

2. **Admin Dashboard:**
   - Navigate to http://localhost:3000/admin
   - View all registrations in the table
   - Edit or delete registrations using modal/confirmation
   - Create new events with dynamic categories

3. **API Testing:**
   - Events API: `GET http://localhost:3000/api/events`
   - Single Event: `GET http://localhost:3000/api/events/{id}`
   - Create Registration: `POST http://localhost:3000/api/registrations`

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

### Events Table

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  eventDate TEXT NOT NULL,
  location TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Categories Table

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId TEXT NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,
  maxCapacity INTEGER
);
```

### Registrations Table

```sql
CREATE TABLE registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId TEXT NOT NULL REFERENCES events(id),
  categoryId INTEGER NOT NULL REFERENCES categories(id),
  applicantName TEXT NOT NULL,
  applicantEmail TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'USER',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Public Endpoints

#### List All Events

```
GET /api/events

Response:
{
  "success": true,
  "events": [
    {
      "id": "event_xxx",
      "title": "Sample Event",
      "description": "Event details",
      "eventDate": "2026-08-10T14:00:00Z",
      "location": "New York",
      "categories": [
        { "id": 1, "name": "Girl", "maxCapacity": 20 }
      ],
      "createdAt": "2026-08-05T22:00:00Z"
    }
  ],
  "total": 1
}
```

#### Get Single Event

```
GET /api/events/{id}

Response:
{
  "success": true,
  "event": {
    "id": "event_xxx",
    "title": "Sample Event",
    "eventDate": "2026-08-10T14:00:00Z",
    "categories": [...],
    "participantsByCategory": {
      "1": {
        "category": { "id": 1, "name": "Girl", "maxCapacity": 20 },
        "participants": [
          { "id": 1, "name": "John Doe", "createdAt": "2026-08-05T22:00:00Z" }
        ]
      }
    },
    "registrationCount": 1
  }
}
```

#### Create Registration

```
POST /api/registrations

Request:
{
  "eventId": "event_xxx",
  "categoryId": 1,
  "applicantName": "John Doe",
  "applicantEmail": "john@example.com"
}

Response:
{
  "success": true,
  "registrationId": 1,
  "message": "Registration submitted successfully"
}
```

### Admin Endpoints

#### List All Registrations

```
GET /api/registrations

Response:
{
  "success": true,
  "registrations": [
    {
      "id": 1,
      "eventId": "event_xxx",
      "categoryId": 1,
      "applicantName": "John Doe",
      "applicantEmail": "john@example.com",
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
  "eventDate": "2026-08-10T14:00:00Z",
  "location": "New York",
  "categories": [
    { "name": "Girl", "maxCapacity": 20 },
    { "name": "1x1 Open" }
  ]
}

Response:
{
  "success": true,
  "eventId": "event_xxx",
  "categoryCount": 2,
  "message": "Event created successfully"
}
```

#### Update Registration

```
PUT /api/registrations/{id}

Request:
{
  "applicantName": "Updated Name",
  "categoryId": 2
}

Response:
{
  "success": true,
  "registrationId": 1,
  "message": "Registration updated successfully"
}
```

#### Delete Registration

```
DELETE /api/registrations/{id}

Response:
{
  "success": true,
  "message": "Registration deleted successfully",
  "id": 1
}
```

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

1. **Email Privacy:** Applicant emails are NEVER returned in public API responses (e.g., event details endpoint)
2. **Admin Only:** User management and admin endpoints should be protected with authentication
3. **Validation:** All inputs are validated server-side using Valibot schemas
4. **Database:** D1 is SQLite - ensure database file is not exposed in version control

### Environment Variables

- Never commit `.env.local` or sensitive credentials
- Use Cloudflare dashboard for production secrets
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
