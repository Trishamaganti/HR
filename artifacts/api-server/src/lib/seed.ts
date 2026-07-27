import { db } from "@workspace/db";
import { usersTable, companiesTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const PASSWORD_HASH = crypto
  .createHash("sha256")
  .update("Demo@1234" + "ihr_salt_2024")
  .digest("hex");

const EMPLOYEES = [
  {
    email: "admin@txsprint.com",
    fullName: "Org Admin",
    role: "admin" as const,
    employeeId: "EMP000",
    code: "EMP000",
    department: "Management",
    designation: "Administrator",
    salary: 100000,
    joiningDate: "2021-01-01",
    leaveBalance: 20,
  },
  {
    email: "hr@txsprint.com",
    fullName: "Sarah HR",
    role: "hr" as const,
    employeeId: "EMP001",
    code: "EMP001",
    department: "Human Resources",
    designation: "HR Manager",
    salary: 75000,
    joiningDate: "2022-01-15",
    leaveBalance: 18,
  },
  {
    email: "candidate1@gmail.com",
    fullName: "John Mark",
    role: "employee" as const,
    employeeId: "EMPTXS001",
    code: "EMPTXS001",
    department: "Engineering",
    designation: "Software Engineer",
    salary: 60000,
    joiningDate: "2023-03-01",
    leaveBalance: 15,
  },
  {
    email: "candidate2@gmail.com",
    fullName: "Peter Wills",
    role: "employee" as const,
    employeeId: "EMPTXS002",
    code: "EMPTXS002",
    department: "Engineering",
    designation: "Backend Developer",
    salary: 58000,
    joiningDate: "2023-04-15",
    leaveBalance: 15,
  },
  {
    email: "candidate3@gmail.com",
    fullName: "Sarah Chen",
    role: "employee" as const,
    employeeId: "EMPTXS003",
    code: "EMPTXS003",
    department: "Design",
    designation: "UI/UX Designer",
    salary: 55000,
    joiningDate: "2023-05-01",
    leaveBalance: 15,
  },
  {
    email: "candidate4@gmail.com",
    fullName: "Alex Torres",
    role: "employee" as const,
    employeeId: "EMPTXS004",
    code: "EMPTXS004",
    department: "Product",
    designation: "Product Analyst",
    salary: 57000,
    joiningDate: "2023-06-10",
    leaveBalance: 15,
  },
  {
    email: "candidate5@gmail.com",
    fullName: "Jamie Rivera",
    role: "employee" as const,
    employeeId: "EMPTXS005",
    code: "EMPTXS005",
    department: "Operations",
    designation: "Operations Coordinator",
    salary: 52000,
    joiningDate: "2023-07-20",
    leaveBalance: 15,
  },
];

export async function ensureSeeded(): Promise<void> {
  try {
    // Ensure company exists
    let companyId: number | undefined;
    const existingCompany = await db.select().from(companiesTable).limit(1);
    if (existingCompany.length > 0) {
      companyId = existingCompany[0].id;
    } else {
      const [company] = await db
        .insert(companiesTable)
        .values({
          name: "TxSprint Technologies",
          slug: "txsprint",
          industry: "Technology",
          companySize: "51-200",
          website: "https://txsprint.com",
          status: "active",
          plan: "professional",
          employeeCount: 85,
        })
        .returning();
      companyId = company?.id;
    }

    if (!companyId) {
      console.error("[seed] Failed to get company id");
      return;
    }

    const cId = companyId;

    // Upsert super admin (no company)
    await db
      .insert(usersTable)
      .values({
        email: "superadmin@ihr.com",
        passwordHash: PASSWORD_HASH,
        fullName: "Super Admin",
        role: "super_admin",
      })
      .onConflictDoNothing();

    // Upsert all employees into users table — use onConflictDoNothing to preserve
    // any manual role changes made via the admin UI
    for (const emp of EMPLOYEES) {
      await db
        .insert(usersTable)
        .values({
          email: emp.email,
          passwordHash: PASSWORD_HASH,
          fullName: emp.fullName,
          role: emp.role,
          companyId: cId,
          employeeId: emp.employeeId,
        })
        .onConflictDoNothing();
    }

    // Keep users' names, employee IDs and company up-to-date without overriding
    // the role (an admin may have promoted someone via the UI)
    for (const emp of EMPLOYEES) {
      await db
        .update(usersTable)
        .set({
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          companyId: cId,
        })
        .where(eq(usersTable.email, emp.email));
    }

    // Fetch all users so we can link employees table records
    const allUsers = await db.select().from(usersTable);

    // Upsert employee records (always keep in sync)
    for (const emp of EMPLOYEES) {
      const user = allUsers.find((u) => u.email === emp.email);
      if (!user) continue;

      const existing = await db
        .select()
        .from(employeesTable)
        .where(eq(employeesTable.employeeCode, emp.code))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(employeesTable).values({
          employeeCode: emp.code,
          userId: user.id,
          fullName: emp.fullName,
          email: emp.email,
          companyId: cId,
          department: emp.department,
          designation: emp.designation,
          salary: emp.salary,
          joiningDate: emp.joiningDate,
          status: "active",
          leaveBalance: emp.leaveBalance,
        });
      } else {
        await db
          .update(employeesTable)
          .set({
            fullName: emp.fullName,
            email: emp.email,
            userId: user.id,
          })
          .where(eq(employeesTable.employeeCode, emp.code));
      }
    }

    console.log("[seed] Demo data seeded successfully");
  } catch (err) {
    console.error("[seed] Seeding failed (non-fatal):", err);
  }
}
