import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "part_time", "contract", "internship"]);
export const workModeEnum = pgEnum("work_mode", ["remote", "hybrid", "onsite"]);
export const jobStatusEnum = pgEnum("job_status", ["open", "closed", "draft"]);

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  companyId: integer("company_id").notNull(),
  department: text("department").notNull(),
  employmentType: employmentTypeEnum("employment_type").notNull().default("full_time"),
  experienceLevel: text("experience_level"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  skills: text("skills"),
  description: text("description"),
  location: text("location"),
  workMode: workModeEnum("work_mode"),
  openings: integer("openings").default(1),
  deadline: text("deadline"),
  status: jobStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
