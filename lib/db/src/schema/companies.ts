import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companyStatusEnum = pgEnum("company_status", ["active", "suspended", "pending"]);

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry").notNull(),
  companySize: text("company_size"),
  logoUrl: text("logo_url"),
  website: text("website"),
  status: companyStatusEnum("status").notNull().default("active"),
  plan: text("plan").default("starter"),
  employeeCount: integer("employee_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
