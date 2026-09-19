CREATE TABLE `base_resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`language` text DEFAULT '中文' NOT NULL,
	`original_file_name` text DEFAULT '' NOT NULL,
	`original_mime` text DEFAULT '' NOT NULL,
	`original_data` text DEFAULT '' NOT NULL,
	`extracted_text` text DEFAULT '' NOT NULL,
	`confirmed_content` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`client_token` text NOT NULL,
	`label` text DEFAULT '批量导入' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	`saved_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`undone_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_batches_client_token_unique` ON `import_batches` (`client_token`);--> statement-breakpoint
CREATE TABLE `import_items` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`job_id` text,
	`result` text NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`original_name` text DEFAULT '' NOT NULL,
	`fingerprint` text DEFAULT '' NOT NULL,
	`previous_snapshot` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_import_items_batch_id` ON `import_items` (`batch_id`);--> statement-breakpoint
CREATE TABLE `job_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`applied_date` text DEFAULT '' NOT NULL,
	`channel` text DEFAULT '' NOT NULL,
	`status` text DEFAULT '已投递' NOT NULL,
	`resume_version_id` text,
	`legacy_resume_label` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_job_applications_job_id` ON `job_applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_job_applications_status` ON `job_applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_job_applications_applied_date` ON `job_applications` (`applied_date`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '其他' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`recruitment_type` text DEFAULT '校招' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`requirements` text DEFAULT '' NOT NULL,
	`job_url` text DEFAULT '' NOT NULL,
	`normalized_url` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`source_job_id` text DEFAULT '' NOT NULL,
	`published_date` text DEFAULT '' NOT NULL,
	`deadline` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`raw_text` text DEFAULT '' NOT NULL,
	`company_intro` text DEFAULT '' NOT NULL,
	`interview_experience` text DEFAULT '' NOT NULL,
	`written_test_materials` text DEFAULT '' NOT NULL,
	`common_questions` text DEFAULT '' NOT NULL,
	`preparation_notes` text DEFAULT '' NOT NULL,
	`is_draft` integer DEFAULT false NOT NULL,
	`import_batch_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_company_position` ON `jobs` (`company`,`position`);--> statement-breakpoint
CREATE INDEX `idx_jobs_normalized_url` ON `jobs` (`normalized_url`);--> statement-breakpoint
CREATE INDEX `idx_jobs_source_job_id` ON `jobs` (`source`,`source_job_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_updated_at` ON `jobs` (`updated_at`);--> statement-breakpoint
CREATE TABLE `resume_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`base_resume_id` text NOT NULL,
	`job_id` text,
	`title` text NOT NULL,
	`language` text DEFAULT '中文' NOT NULL,
	`intensity` text DEFAULT '轻度润色' NOT NULL,
	`content` text NOT NULL,
	`suggestions` text DEFAULT '[]' NOT NULL,
	`jd_snapshot` text DEFAULT '' NOT NULL,
	`status` text DEFAULT '草稿' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`base_resume_id`) REFERENCES `base_resumes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_resume_versions_job_id` ON `resume_versions` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_resume_versions_base_resume_id` ON `resume_versions` (`base_resume_id`);