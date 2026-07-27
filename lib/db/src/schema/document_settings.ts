import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const documentSettingsTable = pgTable("document_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().unique(),
  logo: text("logo"),
  letterhead: text("letterhead"),
  stamp: text("stamp"),
  signature: text("signature"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyWebsite: text("company_website"),
  hrName: text("hr_name"),
  hrTitle: text("hr_title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DocumentSettings = typeof documentSettingsTable.$inferSelect;
export type InsertDocumentSettings = typeof documentSettingsTable.$inferInsert;
