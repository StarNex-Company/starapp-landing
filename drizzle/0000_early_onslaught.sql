CREATE TABLE `waitlist_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`audience` text NOT NULL,
	`talent` text NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_email_audience_unique` ON `waitlist_entries` (`email`,`audience`);--> statement-breakpoint
CREATE TABLE `waitlist_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL
);
