import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateEmployeeBody, UpdateEmployeeBody } from "@workspace/api-zod";

const router = Router();

function mapEmployee(e: typeof employeesTable.$inferSelect) {
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    firstName: e.firstName,
    middleName: e.middleName,
    lastName: e.lastName,
    email: e.email,
    companyId: e.companyId,
    department: e.department,
    designation: e.designation,
    jobTitle: e.jobTitle,
    grade: e.grade,
    band: e.band,
    employmentType: e.employmentType,
    location: e.location,
    reportingManager: e.reportingManager,
    reportingManagerId: e.reportingManagerId,
    salary: e.salary,
    basicSalary: e.basicSalary,
    hra: e.hra,
    transportAllowance: e.transportAllowance,
    medicalAllowance: e.medicalAllowance,
    specialAllowance: e.specialAllowance,
    salaryUpdatedDate: e.salaryUpdatedDate,
    joiningDate: e.joiningDate,
    positionUpdatedDate: e.positionUpdatedDate,
    probationEndDate: e.probationEndDate,
    confirmationDate: e.confirmationDate,
    dob: e.dob,
    doe: e.doe,
    ofcEmail: e.ofcEmail,
    ofcNumber: e.ofcNumber,
    mobileNumber: e.mobileNumber,
    personalEmail: e.personalEmail,
    address: e.address,
    city: e.city,
    state: e.state,
    pincode: e.pincode,
    country: e.country,
    emergencyContactName: e.emergencyContactName,
    emergencyContactRelation: e.emergencyContactRelation,
    emergencyContactNumber: e.emergencyContactNumber,
    bankName: e.bankName,
    bankAccountNumber: e.bankAccountNumber,
    bankIfscCode: e.bankIfscCode,
    bankAccountType: e.bankAccountType,
    panNumber: e.panNumber,
    aadharNumber: e.aadharNumber,
    passportNumber: e.passportNumber,
    uan: e.uan,
    esicNumber: e.esicNumber,
    status: e.status,
    avatarUrl: e.avatarUrl,
    leaveBalance: e.leaveBalance,
    notes: e.notes,
  };
}

router.get("/employees", async (req, res) => {
  const { companyId, department } = req.query as Record<string, string | undefined>;
  let employees = await db.select().from(employeesTable).orderBy(employeesTable.createdAt);
  if (companyId) employees = employees.filter(e => e.companyId === parseInt(companyId));
  if (department) employees = employees.filter(e => e.department === department);
  res.json(employees.map(mapEmployee));
});

router.post("/employees", async (req, res) => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data as Record<string, unknown>;
  const count = await db.select().from(employeesTable).where(eq(employeesTable.companyId, data.companyId as number));
  const empCode = `EMP${(count.length + 1).toString().padStart(3, "0")}`;

  const [emp] = await db.insert(employeesTable).values({
    employeeCode: empCode,
    fullName: data.fullName as string,
    firstName: (data.firstName as string) ?? null,
    middleName: (data.middleName as string) ?? null,
    lastName: (data.lastName as string) ?? null,
    email: data.email as string,
    companyId: data.companyId as number,
    department: data.department as string,
    designation: (data.designation as string) ?? null,
    jobTitle: (data.jobTitle as string) ?? null,
    grade: (data.grade as string) ?? null,
    band: (data.band as string) ?? null,
    employmentType: (data.employmentType as any) ?? null,
    location: (data.location as string) ?? null,
    salary: data.salary ? parseInt(data.salary as string) : null,
    basicSalary: (data.basicSalary as number) ?? null,
    joiningDate: (data.joiningDate as string) ?? null,
    dob: (data.dob as string) ?? null,
    doe: (data.doe as string) ?? null,
    ofcEmail: (data.ofcEmail as string) ?? null,
    ofcNumber: (data.ofcNumber as string) ?? null,
    mobileNumber: (data.mobileNumber as string) ?? null,
    personalEmail: (data.personalEmail as string) ?? null,
    reportingManager: (data.reportingManager as string) ?? null,
    reportingManagerId: (data.reportingManagerId as number) ?? null,
    status: "active",
  }).returning();
  res.status(201).json(mapEmployee(emp));
});

router.get("/employees/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id)).limit(1);
  if (!emp) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapEmployee(emp));
});

router.patch("/employees/:id/role", async (req, res) => {
  const id = parseInt(req.params.id);
  const { accessLevel } = req.body as { accessLevel: string };

  const roleMap: Record<string, string> = {
    owner: "owner",
    manager: "manager",
    employee: "employee",
  };
  const newRole = roleMap[accessLevel];
  if (!newRole) {
    res.status(400).json({ error: "Invalid access level" });
    return;
  }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id)).limit(1);
  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  if (emp.userId) {
    await db.update(usersTable).set({ role: newRole as any }).where(eq(usersTable.id, emp.userId));
  }

  res.json({ success: true, role: newRole });
});

router.delete("/employees/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [emp] = await db.delete(employeesTable).where(eq(employeesTable.id, id)).returning();
  if (!emp) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ success: true });
});

router.patch("/employees/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const d = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  const fields = [
    "designation", "jobTitle", "department", "grade", "band", "employmentType", "location",
    "salary", "basicSalary", "hra", "transportAllowance", "medicalAllowance", "specialAllowance",
    "salaryUpdatedDate", "status",
    "reportingManager", "reportingManagerId",
    "joiningDate", "positionUpdatedDate", "probationEndDate", "confirmationDate",
    "dob", "doe",
    "ofcEmail", "ofcNumber", "mobileNumber", "personalEmail",
    "firstName", "middleName", "lastName",
    "address", "city", "state", "pincode", "country",
    "emergencyContactName", "emergencyContactRelation", "emergencyContactNumber",
    "bankName", "bankAccountNumber", "bankIfscCode", "bankAccountType",
    "panNumber", "aadharNumber", "passportNumber", "uan", "esicNumber",
    "notes",
  ];

  for (const f of fields) {
    if (d[f] != null) updates[f] = d[f];
  }

  const [emp] = await db.update(employeesTable).set(updates).where(eq(employeesTable.id, id)).returning();
  if (!emp) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapEmployee(emp));
});

export default router;
