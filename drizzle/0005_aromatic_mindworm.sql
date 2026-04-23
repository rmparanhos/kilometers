CREATE TABLE `strava_raws` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`strava_activity_id` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`strava_meta_json` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strava_raws_user_id_strava_activity_id_unique` ON `strava_raws` (`user_id`,`strava_activity_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `strava_refresh_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `strava_access_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `strava_token_expires_at` integer;