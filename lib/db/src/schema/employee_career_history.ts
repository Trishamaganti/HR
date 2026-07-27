import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careerEventTypeEnum = pgEnum("career_event_type", [
  "joined", "promoted", "role_change", "salary_hike", "bonus", "transferred",
  "resigned", "terminated", "confirmation", "increment", "other"
]);

export const employeeCareerHistoryTable = pgTable("employee_career_history", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  eventType: careerEventTypeEnum("event_type").notNull(),
  effectiveDate: text("effective_date").notNull(),
  date: text("date").notNull(),

  // Role details at the time of event
  title: text("title"),
  designation: text("designation"),
  department: text("department"),
  grade: text("grade"),
  band: text("band"),
  location: text("location"),
  employmentType: text("employment_type"),

  // Compensation at the time of event
  salary: integer("salary"),
  basicSalary: integer("basic_salary"),
  incrementAmount: integer("increment_amount"),
  incrementPercentage: text("increment_percentage"),
  bonusAmount: integer("bonus_amount"),

  // Reporting structure at the time
  reportingManagerId: integer("reporting_manager_id"),
  reportingManager: text("reporting_manager"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareerHistorySchema = createInsertSchema(employeeCareerHistoryTable).omit({ id: true, createdAt: true });
export type InsertCareerHistory = z.infer<typeof insertCareerHistorySchema>;
export type EmployeeCareerHistory = typeof employeeCareerHistoryTable.$inferSelect;
