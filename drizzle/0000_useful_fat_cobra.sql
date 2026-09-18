CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`position` text NOT NULL,
	`category` text DEFAULT '运营' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`recruitment_type` text DEFAULT '校招' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`requirements` text DEFAULT '' NOT NULL,
	`job_url` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`applied_date` text DEFAULT '' NOT NULL,
	`deadline` text DEFAULT '' NOT NULL,
	`channel` text DEFAULT '' NOT NULL,
	`status` text DEFAULT '准备投递' NOT NULL,
	`resume_version` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`company_intro` text DEFAULT '' NOT NULL,
	`interview_experience` text DEFAULT '' NOT NULL,
	`written_test_materials` text DEFAULT '' NOT NULL,
	`common_questions` text DEFAULT '' NOT NULL,
	`preparation_notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
