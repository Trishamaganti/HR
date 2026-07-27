import { pgTable, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payslipStatusEnum = pgEnum("payslip_status", ["draft", "processed", "paid"]);

export const payrollTable = pgTable("payroll", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  basicSalary: integer("basic_salary"),
  allowances: integer("allowances").default(0),
  deductions: integer("deductions").default(0),
  netSalary: integer("net_salary").notNull(),
  status: payslipStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayrollSchema = createInsertSchema(payrollTable).omit({ id: true, createdAt: true });
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Payroll = typeof payrollTable.$inferSelect;
