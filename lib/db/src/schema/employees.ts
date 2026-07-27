import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeeStatusEnum = pgEnum("employee_status", ["active", "inactive", "on_leave", "resigned", "terminated"]);
export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "part_time", "contract", "intern", "probation"]);

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  userId: integer("user_id"),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  email: text("email").notNull(),
  companyId: integer("company_id").notNull(),

  // Position & org
  department: text("department").notNull(),
  designation: text("designation"),
  jobTitle: text("job_title"),
  grade: text("grade"),
  band: text("band"),
  employmentType: employmentTypeEnum("employment_type"),
  location: text("location"),
  reportingManager: text("reporting_manager"),
  reportingManagerId: integer("reporting_manager_id"),

  // Compensation
  salary: integer("salary"),
  basicSalary: integer("basic_salary"),
  hra: integer("hra"),
  transportAllowance: integer("transport_allowance"),
  medicalAllowance: integer("medical_allowance"),
  specialAllowance: integer("special_allowance"),
  salaryUpdatedDate: text("salary_updated_date"),

  // Important dates
  joiningDate: text("joining_date"),
  positionUpdatedDate: text("position_updated_date"),
  probationEndDate: text("probation_end_date"),
  confirmationDate: text("confirmation_date"),
  dob: text("dob"),
  doe: text("doe"),

  // Contact
  ofcEmail: text("ofc_email"),
  ofcNumber: text("ofc_number"),
  mobileNumber: text("mobile_number"),
  personalEmail: text("personal_email"),

  // Address
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  country: text("country"),

  // Emergency contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactRelation: text("emergency_contact_relation"),
  emergencyContactNumber: text("emergency_contact_number"),

  // Bank details
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfscCode: text("bank_ifsc_code"),
  bankAccountType: text("bank_account_type"),

  // National IDs
  panNumber: text("pan_number"),
  aadharNumber: text("aadhar_number"),
  passportNumber: text("passport_number"),
  uan: text("uan"),
  esicNumber: text("esic_number"),

  // Misc
  status: employeeStatusEnum("status").notNull().default("active"),
  avatarUrl: text("avatar_url"),
  leaveBalance: integer("leave_balance").default(20),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
