import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "half_day", "late"]);
export const punchTypeEnum = pgEnum("punch_type", ["punch_in", "punch_out"]);

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  date: text("date").notNull(),
  punchIn: text("punch_in"),
  punchOut: text("punch_out"),
  status: attendanceStatusEnum("status").notNull().default("present"),
  hoursWorked: real("hours_worked"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
