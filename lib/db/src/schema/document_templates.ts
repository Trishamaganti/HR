import { pgTable, serial, integer, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const documentTypeEnum = pgEnum("document_type", ["offer_letter", "conditional_offer", "payslip"]);

export const documentTemplatesTable = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  type: documentTypeEnum("type").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DocumentTemplate = typeof documentTemplatesTable.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplatesTable.$inferInsert;
