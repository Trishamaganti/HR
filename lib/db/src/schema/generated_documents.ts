import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const documentStatusEnum = pgEnum("document_status", ["draft", "approved", "sent"]);

export const generatedDocumentsTable = pgTable("generated_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  payrollId: integer("payroll_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: documentStatusEnum("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GeneratedDocument = typeof generatedDocumentsTable.$inferSelect;
export type InsertGeneratedDocument = typeof generatedDocumentsTable.$inferInsert;
