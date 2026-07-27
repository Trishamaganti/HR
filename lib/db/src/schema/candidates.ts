import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  mobile: text("mobile"),
  headline: text("headline"),
  location: text("location"),
  resumeUrl: text("resume_url"),
  skills: text("skills"),
  experience: integer("experience"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  avatarUrl: text("avatar_url"),

  // Personal details
  firstName: text("first_name"),
  middleName: text("middle_name"),
  surname: text("surname"),
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  dateOfBirth: text("date_of_birth"),
  personalEmail: text("personal_email"),
  fathersName: text("fathers_name"),
  mothersName: text("mothers_name"),

  // Education (JSON: { pg, ug, hse, se } each with specialization, institute, passedOut)
  education: text("education"),

  // Addresses
  currentAddress: text("current_address"),
  homeAddress: text("home_address"),

  // Emergency contacts (JSON: [{fullName, relationship, phone}])
  emergencyContacts: text("emergency_contacts"),

  // Reference
  hasReference: text("has_reference"),
  refereeName: text("referee_name"),
  refereePhone: text("referee_phone"),
  refereeEmail: text("referee_email"),

  // Bank details
  bankName: text("bank_name"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfscCode: text("bank_ifsc_code"),
  bankBranchName: text("bank_branch_name"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({ id: true, createdAt: true });
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
