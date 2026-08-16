-- Corrective migration: an earlier revision of 0006 rebuilt the `events`
-- table by renaming it to a temporary name first. SQLite automatically
-- rewrote the FK clauses in `event_categories` and `event_registrations` to
-- point at that temporary table name, and once the temporary table was
-- dropped those FKs were left dangling (referencing a table that no longer
-- exists). Any insert/update touching those FK columns then failed with a
-- foreign key constraint error. This migration rebuilds both tables so
-- their FK once again references `events(id)`, preserving all existing
-- rows.
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_event_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_event_categories` (`id`, `event_id`, `name`, `created_at`)
SELECT `id`, `event_id`, `name`, `created_at` FROM `event_categories`;
--> statement-breakpoint
DROP TABLE `event_categories`;
--> statement-breakpoint
ALTER TABLE `__new_event_categories` RENAME TO `event_categories`;
--> statement-breakpoint
CREATE TABLE `__new_event_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`participant_name` text NOT NULL,
	`participant_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_event_registrations` (`id`, `event_id`, `participant_name`, `participant_email`, `created_at`)
SELECT `id`, `event_id`, `participant_name`, `participant_email`, `created_at` FROM `event_registrations`;
--> statement-breakpoint
DROP TABLE `event_registrations`;
--> statement-breakpoint
ALTER TABLE `__new_event_registrations` RENAME TO `event_registrations`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
