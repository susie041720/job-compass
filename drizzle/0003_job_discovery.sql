CREATE TABLE `discovered_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '其他' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`recruitment_type` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`requirements` text DEFAULT '' NOT NULL,
	`job_url` text DEFAULT '' NOT NULL,
	`normalized_url` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`source_kind` text DEFAULT 'manual' NOT NULL,
	`source_job_id` text DEFAULT '' NOT NULL,
	`published_date` text DEFAULT '' NOT NULL,
	`deadline` text DEFAULT '' NOT NULL,
	`graduation_requirement` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`raw_text` text DEFAULT '' NOT NULL,
	`availability_status` text DEFAULT 'active' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`fetched_at` text NOT NULL,
	`source_updated_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_discovered_jobs_company_position` ON `discovered_jobs` (`company`,`position`);--> statement-breakpoint
CREATE INDEX `idx_discovered_jobs_normalized_url` ON `discovered_jobs` (`normalized_url`);--> statement-breakpoint
CREATE INDEX `idx_discovered_jobs_source_job_id` ON `discovered_jobs` (`source`,`source_job_id`);--> statement-breakpoint
CREATE INDEX `idx_discovered_jobs_published_date` ON `discovered_jobs` (`published_date`);--> statement-breakpoint
CREATE INDEX `idx_discovered_jobs_status` ON `discovered_jobs` (`availability_status`);--> statement-breakpoint
CREATE TABLE `discovery_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`base_resume_id` text,
	`preferred_cities` text DEFAULT '[]' NOT NULL,
	`priority_cities` text DEFAULT '[]' NOT NULL,
	`recruitment_types` text DEFAULT '[]' NOT NULL,
	`target_directions` text DEFAULT '[]' NOT NULL,
	`graduation_date` text DEFAULT '' NOT NULL,
	`available_from` text DEFAULT '' NOT NULL,
	`search_stage` text DEFAULT '实习' NOT NULL,
	`company_preferences` text DEFAULT '[]' NOT NULL,
	`extra_keywords` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `discovery_states` (
	`job_id` text PRIMARY KEY NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_dismissed` integer DEFAULT false NOT NULL,
	`dismiss_reason` text DEFAULT '' NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`outbound_count` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` text DEFAULT '' NOT NULL,
	`last_outbound_at` text DEFAULT '' NOT NULL,
	`applied_job_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `discovered_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_discovery_states_favorite` ON `discovery_states` (`is_favorite`);--> statement-breakpoint
CREATE INDEX `idx_discovery_states_dismissed` ON `discovery_states` (`is_dismissed`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `department` text DEFAULT '' NOT NULL;