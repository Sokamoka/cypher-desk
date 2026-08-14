CREATE TABLE `phase_board_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phase_id` text NOT NULL,
	`participant_id` integer NOT NULL,
	`slider_value` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `category_phases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `event_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phase_board_scores_phase_participant_unique` ON `phase_board_scores` (`phase_id`,`participant_id`);--> statement-breakpoint
CREATE TABLE `phase_boards` (
	`phase_id` text PRIMARY KEY NOT NULL,
	`is_started` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `category_phases`(`id`) ON UPDATE no action ON DELETE cascade
);
