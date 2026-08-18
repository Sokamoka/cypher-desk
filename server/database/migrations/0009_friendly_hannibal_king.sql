CREATE TABLE `cypher_judge_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cypher_id` text NOT NULL,
	`judge_name` text NOT NULL,
	`participant_id` integer NOT NULL,
	`slider_value` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`cypher_id`) REFERENCES `preselection_cyphers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `event_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cypher_judge_scores_cypher_judge_participant_unique` ON `cypher_judge_scores` (`cypher_id`,`judge_name`,`participant_id`);