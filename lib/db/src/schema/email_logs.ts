import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentBy: text("sent_by"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogsTable).omit({ id: true, sentAt: true });
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogsTable.$inferSelect;
