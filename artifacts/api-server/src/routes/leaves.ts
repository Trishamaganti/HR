import { Router } from "express";
import { db } from "@workspace/db";
import { leavesTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateLeaveBody, UpdateLeaveStatusBody } from "@workspace/api-zod";

const router = Router();

async function mapLeave(l: typeof leavesTable.$inferSelect) {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, l.employeeId)).limit(1);
  return {
    id: l.id,
    employeeId: l.employeeId,
    employeeName: emp?.fullName ?? null,
    leaveType: l.leaveType,
    startDate: l.startDate,
    endDate: l.endDate,
    days: l.days,
    reason: l.reason,
    status: l.status,
    reviewedBy: l.reviewedBy,
  };
}

router.get("/leaves", async (req, res) => {
  const { employeeId, status } = req.query as Record<string, string | undefined>;
  let leaves = await db.select().from(leavesTable).orderBy(leavesTable.createdAt);
  if (employeeId) leaves = leaves.filter(l => l.employeeId === parseInt(employeeId));
  if (status) leaves = leaves.filter(l => l.status === status);
  const result = await Promise.all(leaves.map(mapLeave));
  res.json(result);
});

router.post("/leaves", async (req, res) => {
  const parsed = CreateLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { employeeId, leaveType, startDate, endDate, reason } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

  const [leave] = await db.insert(leavesTable).values({
    employeeId,
    leaveType: leaveType as "sick" | "casual" | "earned" | "maternity" | "paternity",
    startDate,
    endDate,
    days,
    reason: reason ?? null,
    status: "pending",
  }).returning();
  res.status(201).json(await mapLeave(leave));
});

router.patch("/leaves/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateLeaveStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [leave] = await db.update(leavesTable).set({
    status: parsed.data.status,
    reviewedBy: parsed.data.reviewedBy ?? null,
  }).where(eq(leavesTable.id, id)).returning();
  if (!leave) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapLeave(leave));
});

export default router;
