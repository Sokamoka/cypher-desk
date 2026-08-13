CREATE TABLE `category_phases` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `event_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `preselection_phases` (
	`phase_id` text PRIMARY KEY NOT NULL,
	`number_of_cypher` integer NOT NULL,
	`group_size` integer NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `category_phases`(`id`) ON UPDATE no action ON DELETE cascade
);
