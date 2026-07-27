import { Router } from "express";
import { db } from "@workspace/db";
import { documentSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/document-settings", async (req, res) => {
  const companyId = parseInt(req.query.companyId as string);
  if (!companyId) { res.status(400).json({ error: "companyId required" }); return; }
  const [settings] = await db.select().from(documentSettingsTable).where(eq(documentSettingsTable.companyId, companyId)).limit(1);
  res.json(settings ?? null);
});

router.put("/document-settings", async (req, res) => {
  // Strip DB-managed fields that the frontend may echo back from a prior GET
  const { companyId, id: _id, createdAt: _c, updatedAt: _u, ...fields } = req.body;
  if (!companyId) { res.status(400).json({ error: "companyId required" }); return; }
  const [existing] = await db.select().from(documentSettingsTable).where(eq(documentSettingsTable.companyId, companyId)).limit(1);
  if (existing) {
    const [updated] = await db.update(documentSettingsTable)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(documentSettingsTable.companyId, companyId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(documentSettingsTable)
      .values({ companyId, ...fields })
      .returning();
    res.json(created);
  }
});

export default router;
