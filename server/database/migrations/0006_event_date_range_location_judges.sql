-- NOTE: this uses the "build new table, drop old, rename new into place"
-- order (rather than renaming the original `events` table away first).
-- Renaming `events` away updates the FK definitions embedded in
-- `event_categories`/`event_registrations` to point at the temporary name,
-- and dropping that temporary table afterwards leaves those FKs dangling
-- (pointing at a table that no longer exists). Building the replacement
-- under a temp name and only ever dropping/recreating `events` itself keeps
-- other tables' `REFERENCES events(id)` clauses valid throughout.
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`location` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`judges` text DEFAULT '[]' NOT NULL,
	`slug` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_events` (
	`id`,
	`user_id`,
	`title`,
	`description`,
	`location`,
	`start_date`,
	`end_date`,
	`judges`,
	`slug`,
	`created_at`
)
SELECT
	`id`,
	`user_id`,
	`title`,
	`description`,
	'Unknown',
	CASE
		WHEN length(`date`) >= 10 THEN substr(`date`, 1, 10)
		ELSE `date`
	END,
	CASE
		WHEN length(`date`) >= 10 THEN substr(`date`, 1, 10)
		ELSE `date`
	END,
	'[]',
	`slug`,
	`created_at`
FROM `events`;
--> statement-breakpoint
DROP TABLE `events`;
--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;