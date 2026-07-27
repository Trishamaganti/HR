import { Router } from "express";
import { db } from "@workspace/db";
import { employeeCareerHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/employees/:id/career", async (req, res) => {
  const id = parseInt(req.params.id);
  const records = await db
    .select()
    .from(employeeCareerHistoryTable)
    .where(eq(employeeCareerHistoryTable.employeeId, id))
    .orderBy(employeeCareerHistoryTable.effectiveDate);
  res.json(records);
});

router.post("/employees/:id/career", async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    eventType, date, effectiveDate,
    title, designation, department, grade, band, location, employmentType,
    salary, basicSalary, incrementAmount, incrementPercentage, bonusAmount,
    reportingManagerId, reportingManager,
    notes,
  } = req.body;

  if (!eventType || !date) {
    res.status(400).json({ error: "eventType and date are required" });
    return;
  }

  const [record] = await db.insert(employeeCareerHistoryTable).values({
    employeeId: id,
    eventType,
    date,
    effectiveDate: effectiveDate ?? date,
    title: title ?? null,
    designation: designation ?? null,
    department: department ?? null,
    grade: grade ?? null,
    band: band ?? null,
    location: location ?? null,
    employmentType: employmentType ?? null,
    salary: salary ? parseInt(salary) : null,
    basicSalary: basicSalary ? parseInt(basicSalary) : null,
    incrementAmount: incrementAmount ? parseInt(incrementAmount) : null,
    incrementPercentage: incrementPercentage ?? null,
    bonusAmount: bonusAmount ? parseInt(bonusAmount) : null,
    reportingManagerId: reportingManagerId ? parseInt(reportingManagerId) : null,
    reportingManager: reportingManager ?? null,
    notes: notes ?? null,
  }).returning();
  res.status(201).json(record);
});

router.delete("/employees/:id/career/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  await db.delete(employeeCareerHistoryTable).where(eq(employeeCareerHistoryTable.id, eventId));
  res.json({ ok: true });
});

export default router;
