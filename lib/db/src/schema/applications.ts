import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationStatusEnum = pgEnum("application_status", [
  "applied", "ats_tracking", "screening", "shortlisted",
  "interview", "offer", "conditional_offer", "verification", "final_offer",
  "hired", "rejected"
]);

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  candidateId: integer("candidate_id").notNull(),
  status: applicationStatusEnum("status").notNull().default("applied"),
  atsScore: integer("ats_score"),
  matchPercent: integer("match_percent"),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
  meetingLink: text("meeting_link"),
  calendarLink: text("calendar_link"),
  interviewRound: integer("interview_round").default(1),
  salaryOffer: integer("salary_offer"),
  joiningDate: text("joining_date"),
  offerNotes: text("offer_notes"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, appliedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
