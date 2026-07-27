import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { PunchAttendanceBody } from "@workspace/api-zod";

const router = Router();

function mapAttendance(a: typeof attendanceTable.$inferSelect, employeeName?: string | null, employeeCode?: string | null) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    employeeName: employeeName ?? null,
    employeeCode: employeeCode ?? null,
    date: a.date,
    punchIn: a.punchIn,
    punchOut: a.punchOut,
    status: a.status,
    hoursWorked: a.hoursWorked,
    location: a.location ?? null,
  };
}

router.get("/attendance", async (req, res) => {
  const { employeeId, date, dateFrom, dateTo, search } = req.query as Record<string, string | undefined>;

  let records = await db.select().from(attendanceTable).orderBy(attendanceTable.date);

  if (employeeId) records = records.filter(r => r.employeeId === parseInt(employeeId));
  if (date) records = records.filter(r => r.date === date);
  if (dateFrom) records = records.filter(r => r.date >= dateFrom);
  if (dateTo) records = records.filter(r => r.date <= dateTo);

  const employees = await db.select().from(employeesTable);
  const empMap = new Map(employees.map(e => [e.id, { name: e.fullName, code: e.employeeCode }]));

  let results = records.map(r => {
    const emp = empMap.get(r.employeeId);
    return mapAttendance(r, emp?.name, emp?.code);
  });

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(r =>
      (r.employeeName ?? "").toLowerCase().includes(q) ||
      (r.employeeCode ?? "").toLowerCase().includes(q) ||
      r.employeeId.toString().includes(q)
    );
  }

  res.json(results);
});

router.post("/attendance/punch", async (req, res) => {
  const parsed = PunchAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { employeeId, type, location } = parsed.data;
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const [todayRecord] = await db.select().from(attendanceTable).where(
    and(
      eq(attendanceTable.employeeId, employeeId),
      eq(attendanceTable.date, today)
    )
  ).limit(1);

  if (type === "punch_in") {
    if (todayRecord) {
      res.json(mapAttendance(todayRecord));
      return;
    }
    const [record] = await db.insert(attendanceTable).values({
      employeeId,
      date: today,
      punchIn: now,
      status: "present",
      location: location ?? null,
    }).returning();
    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);
    res.json(mapAttendance(record, emp?.fullName, emp?.employeeCode));
  } else {
    if (!todayRecord) {
      res.status(404).json({ error: "No punch-in record for today" });
      return;
    }
    const punchInTime = todayRecord.punchIn ? new Date(todayRecord.punchIn) : null;
    const hoursWorked = punchInTime ? (Date.now() - punchInTime.getTime()) / 3600000 : null;
    const [updated] = await db.update(attendanceTable).set({
      punchOut: now,
      hoursWorked: hoursWorked ? Math.round(hoursWorked * 100) / 100 : null,
    }).where(eq(attendanceTable.id, todayRecord.id)).returning();
    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);
    res.json(mapAttendance(updated, emp?.fullName, emp?.employeeCode));
  }
});

export default router;
