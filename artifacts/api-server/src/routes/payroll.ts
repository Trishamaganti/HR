import { Router } from "express";
import { db } from "@workspace/db";
import { payrollTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function mapPayslip(p: typeof payrollTable.$inferSelect) {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, p.employeeId)).limit(1);
  return {
    id: p.id,
    employeeId: p.employeeId,
    employeeName: emp?.fullName ?? null,
    month: p.month,
    year: p.year,
    basicSalary: p.basicSalary,
    allowances: p.allowances,
    deductions: p.deductions,
    netSalary: p.netSalary,
    status: p.status,
  };
}

router.get("/payroll", async (req, res) => {
  const { employeeId } = req.query as Record<string, string | undefined>;
  let payslips = await db.select().from(payrollTable).orderBy(payrollTable.year, payrollTable.month);
  if (employeeId) payslips = payslips.filter(p => p.employeeId === parseInt(employeeId));
  const result = await Promise.all(payslips.map(mapPayslip));
  res.json(result);
});

router.get("/payroll/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [payslip] = await db.select().from(payrollTable).where(eq(payrollTable.id, id)).limit(1);
  if (!payslip) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapPayslip(payslip));
});

export default router;
