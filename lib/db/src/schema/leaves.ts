import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaveTypeEnum = pgEnum("leave_type", ["sick", "casual", "earned", "maternity", "paternity"]);
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);

export const leavesTable = pgTable("leaves", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  days: integer("days"),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeaveSchema = createInsertSchema(leavesTable).omit({ id: true, createdAt: true });
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leavesTable.$inferSelect;
