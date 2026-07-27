import { Router } from "express";
import { db } from "@workspace/db";
import { generatedDocumentsTable, employeesTable, payrollTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/documents", async (req, res) => {
  const companyId = parseInt(req.query.companyId as string);
  if (!companyId) { res.status(400).json({ error: "companyId required" }); return; }
  const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;

  let docs = await db.select().from(generatedDocumentsTable)
    .where(eq(generatedDocumentsTable.companyId, companyId))
    .orderBy(generatedDocumentsTable.createdAt);

  if (employeeId) docs = docs.filter(d => d.employeeId === employeeId);

  // Attach employee name
  const enriched = await Promise.all(docs.map(async (doc) => {
    const [emp] = await db.select({ fullName: employeesTable.fullName, email: employeesTable.email })
      .from(employeesTable).where(eq(employeesTable.id, doc.employeeId)).limit(1);
    return { ...doc, employeeName: emp?.fullName ?? null, employeeEmail: emp?.email ?? null };
  }));

  res.json(enriched);
});

router.get("/documents/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [doc] = await db.select().from(generatedDocumentsTable).where(eq(generatedDocumentsTable.id, id)).limit(1);
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(doc);
});

router.post("/documents", async (req, res) => {
  const { companyId, employeeId, payrollId, type, title, content } = req.body;
  if (!companyId || !employeeId || !type || !title || !content) {
    res.status(400).json({ error: "companyId, employeeId, type, title, content required" });
    return;
  }
  const [doc] = await db.insert(generatedDocumentsTable)
    .values({ companyId, employeeId, payrollId: payrollId ?? null, type, title, content, status: "draft" })
    .returning();
  res.json(doc);
});

router.patch("/documents/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["draft", "approved", "sent"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "sent") updates.sentAt = new Date();
  const [doc] = await db.update(generatedDocumentsTable)
    .set(updates as any)
    .where(eq(generatedDocumentsTable.id, id))
    .returning();
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(doc);
});

router.delete("/documents/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(generatedDocumentsTable).where(eq(generatedDocumentsTable.id, id));
  res.json({ ok: true });
});

export default router;
