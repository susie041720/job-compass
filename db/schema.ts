import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  position: text("position").notNull(),
  category: text("category").notNull().default("运营"),
  location: text("location").notNull().default(""),
  recruitmentType: text("recruitment_type").notNull().default("校招"),
  description: text("description").notNull().default(""),
  requirements: text("requirements").notNull().default(""),
  jobUrl: text("job_url").notNull().default(""),
  source: text("source").notNull().default(""),
  appliedDate: text("applied_date").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  channel: text("channel").notNull().default(""),
  status: text("status").notNull().default("准备投递"),
  resumeVersion: text("resume_version").notNull().default(""),
  notes: text("notes").notNull().default(""),
  companyIntro: text("company_intro").notNull().default(""),
  interviewExperience: text("interview_experience").notNull().default(""),
  writtenTestMaterials: text("written_test_materials").notNull().default(""),
  commonQuestions: text("common_questions").notNull().default(""),
  preparationNotes: text("preparation_notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_applications_status").on(table.status),
  index("idx_applications_category").on(table.category),
  index("idx_applications_location").on(table.location),
  index("idx_applications_applied_date").on(table.appliedDate),
  index("idx_applications_updated_at").on(table.updatedAt),
]);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  dueDate: text("due_date").notNull().default(""),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

// V2 keeps the job itself separate from the act of applying. The original
// `applications` table stays in place so existing local data can be migrated
// without destructive changes.
export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  company: text("company").notNull().default(""),
  position: text("position").notNull().default(""),
  department: text("department").notNull().default(""),
  category: text("category").notNull().default("其他"),
  location: text("location").notNull().default(""),
  recruitmentType: text("recruitment_type").notNull().default("校招"),
  description: text("description").notNull().default(""),
  requirements: text("requirements").notNull().default(""),
  jobUrl: text("job_url").notNull().default(""),
  normalizedUrl: text("normalized_url").notNull().default(""),
  source: text("source").notNull().default(""),
  sourceJobId: text("source_job_id").notNull().default(""),
  publishedDate: text("published_date").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  tags: text("tags").notNull().default(""),
  rawText: text("raw_text").notNull().default(""),
  companyIntro: text("company_intro").notNull().default(""),
  interviewExperience: text("interview_experience").notNull().default(""),
  writtenTestMaterials: text("written_test_materials").notNull().default(""),
  commonQuestions: text("common_questions").notNull().default(""),
  preparationNotes: text("preparation_notes").notNull().default(""),
  isDraft: integer("is_draft", { mode: "boolean" }).notNull().default(false),
  importBatchId: text("import_batch_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_jobs_company_position").on(table.company, table.position),
  index("idx_jobs_normalized_url").on(table.normalizedUrl),
  index("idx_jobs_source_job_id").on(table.source, table.sourceJobId),
  index("idx_jobs_updated_at").on(table.updatedAt),
]);

export const jobApplications = sqliteTable("job_applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  appliedDate: text("applied_date").notNull().default(""),
  channel: text("channel").notNull().default(""),
  status: text("status").notNull().default("已投递"),
  resumeVersionId: text("resume_version_id"),
  legacyResumeLabel: text("legacy_resume_label").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_job_applications_job_id").on(table.jobId),
  index("idx_job_applications_status").on(table.status),
  index("idx_job_applications_applied_date").on(table.appliedDate),
]);

export const importBatches = sqliteTable("import_batches", {
  id: text("id").primaryKey(),
  clientToken: text("client_token").notNull().unique(),
  label: text("label").notNull().default("批量导入"),
  status: text("status").notNull().default("completed"),
  totalCount: integer("total_count").notNull().default(0),
  savedCount: integer("saved_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  undoneAt: text("undone_at"),
});

// Discovery data stays separate from the user's canonical job library. A row
// is promoted into `jobs` only after the user explicitly confirms an
// application, so browsing and saving recommendations never changes existing
// application statistics.
export const discoveryPreferences = sqliteTable("discovery_preferences", {
  id: text("id").primaryKey(),
  baseResumeId: text("base_resume_id"),
  preferredCities: text("preferred_cities").notNull().default("[]"),
  priorityCities: text("priority_cities").notNull().default("[]"),
  recruitmentTypes: text("recruitment_types").notNull().default("[]"),
  targetDirections: text("target_directions").notNull().default("[]"),
  graduationDate: text("graduation_date").notNull().default(""),
  availableFrom: text("available_from").notNull().default(""),
  searchStage: text("search_stage").notNull().default("实习"),
  companyPreferences: text("company_preferences").notNull().default("[]"),
  extraKeywords: text("extra_keywords").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const discoveredJobs = sqliteTable("discovered_jobs", {
  id: text("id").primaryKey(),
  company: text("company").notNull().default(""),
  position: text("position").notNull().default(""),
  department: text("department").notNull().default(""),
  category: text("category").notNull().default("其他"),
  location: text("location").notNull().default(""),
  recruitmentType: text("recruitment_type").notNull().default(""),
  description: text("description").notNull().default(""),
  requirements: text("requirements").notNull().default(""),
  jobUrl: text("job_url").notNull().default(""),
  normalizedUrl: text("normalized_url").notNull().default(""),
  source: text("source").notNull().default(""),
  sourceKind: text("source_kind").notNull().default("manual"),
  sourceJobId: text("source_job_id").notNull().default(""),
  publishedDate: text("published_date").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  graduationRequirement: text("graduation_requirement").notNull().default(""),
  startDate: text("start_date").notNull().default(""),
  rawText: text("raw_text").notNull().default(""),
  availabilityStatus: text("availability_status").notNull().default("active"),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  fetchedAt: text("fetched_at").notNull(),
  sourceUpdatedAt: text("source_updated_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_discovered_jobs_company_position").on(table.company, table.position),
  index("idx_discovered_jobs_normalized_url").on(table.normalizedUrl),
  index("idx_discovered_jobs_source_job_id").on(table.source, table.sourceJobId),
  index("idx_discovered_jobs_published_date").on(table.publishedDate),
  index("idx_discovered_jobs_status").on(table.availabilityStatus),
]);

export const discoveryStates = sqliteTable("discovery_states", {
  jobId: text("job_id").primaryKey().references(() => discoveredJobs.id, { onDelete: "cascade" }),
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
  isDismissed: integer("is_dismissed", { mode: "boolean" }).notNull().default(false),
  dismissReason: text("dismiss_reason").notNull().default(""),
  viewCount: integer("view_count").notNull().default(0),
  outboundCount: integer("outbound_count").notNull().default(0),
  lastViewedAt: text("last_viewed_at").notNull().default(""),
  lastOutboundAt: text("last_outbound_at").notNull().default(""),
  appliedJobId: text("applied_job_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_discovery_states_favorite").on(table.isFavorite),
  index("idx_discovery_states_dismissed").on(table.isDismissed),
]);

export const importItems = sqliteTable("import_items", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  jobId: text("job_id"),
  result: text("result").notNull(),
  error: text("error").notNull().default(""),
  originalName: text("original_name").notNull().default(""),
  fingerprint: text("fingerprint").notNull().default(""),
  previousSnapshot: text("previous_snapshot").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_import_items_batch_id").on(table.batchId)]);

export const baseResumes = sqliteTable("base_resumes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull().default("中文"),
  originalFileName: text("original_file_name").notNull().default(""),
  originalMime: text("original_mime").notNull().default(""),
  originalData: text("original_data").notNull().default(""),
  extractedText: text("extracted_text").notNull().default(""),
  confirmedContent: text("confirmed_content").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const resumeVersions = sqliteTable("resume_versions", {
  id: text("id").primaryKey(),
  baseResumeId: text("base_resume_id").notNull().references(() => baseResumes.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  language: text("language").notNull().default("中文"),
  intensity: text("intensity").notNull().default("轻度润色"),
  content: text("content").notNull(),
  suggestions: text("suggestions").notNull().default("[]"),
  jdSnapshot: text("jd_snapshot").notNull().default(""),
  status: text("status").notNull().default("草稿"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_resume_versions_job_id").on(table.jobId),
  index("idx_resume_versions_base_resume_id").on(table.baseResumeId),
]);
