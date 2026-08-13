PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_preselection_phases` (
	`phase_id` text PRIMARY KEY NOT NULL,
	`number_of_cypher` integer NOT NULL,
	`group_size` integer NOT NULL,
	FOREIGN KEY (`phase_id`) REFERENCES `category_phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_preselection_phases`("phase_id", "number_of_cypher", "group_size") SELECT "phase_id", "number_of_cypher", "group_size" FROM `preselection_phases`;--> statement-breakpoint
DROP TABLE `preselection_phases`;--> statement-breakpoint
ALTER TABLE `__new_preselection_phases` RENAME TO `preselection_phases`;--> statement-breakpoint
PRAGMA foreign_keys=ON;