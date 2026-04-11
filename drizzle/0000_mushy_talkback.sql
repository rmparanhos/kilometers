CREATE TABLE `accounts` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`equipment_id` text,
	`name` text,
	`sport` text DEFAULT 'running' NOT NULL,
	`source_file` text,
	`source_format` text,
	`external_id` text,
	`started_at` integer NOT NULL,
	`duration_sec` real NOT NULL,
	`moving_time_sec` real,
	`distance_m` real NOT NULL,
	`elevation_gain_m` real,
	`elevation_loss_m` real,
	`start_lat` real,
	`start_lon` real,
	`avg_heart_rate_bpm` real,
	`max_heart_rate_bpm` real,
	`avg_cadence_rpm` real,
	`avg_pace_m_per_s` real,
	`training_load` real,
	`perceived_effort` integer,
	`raw_data_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activities_user_started_idx` ON `activities` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `activities_equipment_idx` ON `activities` (`equipment_id`);--> statement-breakpoint
CREATE TABLE `activity_laps` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`lap_index` integer NOT NULL,
	`started_at` integer,
	`duration_sec` real,
	`distance_m` real,
	`avg_heart_rate_bpm` real,
	`avg_pace_m_per_s` real,
	`avg_cadence_rpm` real,
	`elevation_gain_m` real,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'shoe' NOT NULL,
	`purchase_date` integer,
	`retired_at` integer,
	`total_distance_m` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`hashed_password` text NOT NULL,
	`name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
