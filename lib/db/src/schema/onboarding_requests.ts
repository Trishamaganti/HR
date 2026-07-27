import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const onboardingRequestsTable = pgTable("onboarding_requests", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  companyId: integer("company_id").notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  candidateId: integer("candidate_id"),
  inviteeEmail: text("invitee_email"),
  inviteeName: text("invitee_name"),
  requestedFields: text("requested_fields"),
  sharedData: text("shared_data"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OnboardingRequest = typeof onboardingRequestsTable.$inferSelect;
