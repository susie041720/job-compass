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
