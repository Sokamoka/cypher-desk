CREATE TABLE `preselection_cypher_participants` (
	`cypher_id` text NOT NULL,
	`registration_id` integer NOT NULL,
	PRIMARY KEY(`cypher_id`, `registration_id`),
	FOREIGN KEY (`cypher_id`) REFERENCES `preselection_cyphers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `preselection_cyphers` (
	`id` text PRIMARY KEY NOT NULL,
	`phase_id` text NOT NULL,
	`cypher_index` integer NOT NULL,
	`judges` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `category_phases`(`id`) ON UPDATE no action ON DELETE cascade
);
