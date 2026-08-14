import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Better Auth core tables (email/password auth backed by Cloudflare D1)
// ---------------------------------------------------------------------------

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp',
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
});

// ---------------------------------------------------------------------------
// Domain tables (user-owned events + public flat registrations)
// ---------------------------------------------------------------------------

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const eventRegistrations = sqliteTable('event_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  participantName: text('participant_name').notNull(),
  participantEmail: text('participant_email').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Event-specific categories (e.g. "Girls", "Boys") that an organizer defines
// per event at creation time or later via edit.
export const eventCategories = sqliteTable('event_categories', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Many-to-many join: a single registration can belong to multiple categories.
export const registrationCategories = sqliteTable(
  'registration_categories',
  {
    registrationId: integer('registration_id')
      .notNull()
      .references(() => eventRegistrations.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => eventCategories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.registrationId, table.categoryId] }),
  }),
);

// Phases that belong to an event category. `type` is extensible for
// additional implementations (e.g. `bracket`) while still allowing
// type-specific detail tables like `preselection_phases`.
export const categoryPhases = sqliteTable('category_phases', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => eventCategories.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  name: text('name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// One-to-one details for `preselection` phases.
export const preselectionPhases = sqliteTable('preselection_phases', {
  phaseId: text('phase_id')
    .primaryKey()
    .references(() => categoryPhases.id, { onDelete: 'cascade' }),
  numberOfCypher: integer('number_of_cypher').notNull(),
  groupSize: integer('group_size').notNull(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type NewEventRegistration = typeof eventRegistrations.$inferInsert;

export type EventCategory = typeof eventCategories.$inferSelect;
export type NewEventCategory = typeof eventCategories.$inferInsert;

export type RegistrationCategory = typeof registrationCategories.$inferSelect;
export type NewRegistrationCategory = typeof registrationCategories.$inferInsert;

export type CategoryPhase = typeof categoryPhases.$inferSelect;
export type NewCategoryPhase = typeof categoryPhases.$inferInsert;

export type PreselectionPhase = typeof preselectionPhases.$inferSelect;
export type NewPreselectionPhase = typeof preselectionPhases.$inferInsert;
