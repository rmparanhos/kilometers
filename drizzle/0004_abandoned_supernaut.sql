CREATE TABLE `garmin_raws` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`garmin_activity_id` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`garmin_meta_json` text,
	`fit_path` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `garmin_raws_user_id_garmin_activity_id_unique` ON `garmin_raws` (`user_id`,`garmin_activity_id`);