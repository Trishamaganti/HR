import { Router } from "express";
import { db } from "@workspace/db";
import { documentTemplatesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/document-templates", async (req, res) => {
  const companyId = parseInt(req.query.companyId as string);
  if (!companyId) { res.status(400).json({ error: "companyId required" }); return; }
  const templates = await db.select().from(documentTemplatesTable).where(eq(documentTemplatesTable.companyId, companyId));
  res.json(templates);
});

router.put("/document-templates/:type", async (req, res) => {
  const { type } = req.params;
  const { companyId, name, content } = req.body;
  if (!companyId || !content) { res.status(400).json({ error: "companyId and content required" }); return; }
  const [existing] = await db.select().from(documentTemplatesTable)
    .where(and(eq(documentTemplatesTable.companyId, companyId), eq(documentTemplatesTable.type, type as any)))
    .limit(1);
  if (existing) {
    const [updated] = await db.update(documentTemplatesTable)
      .set({ name: name || existing.name, content, updatedAt: new Date() })
      .where(eq(documentTemplatesTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(documentTemplatesTable)
      .values({ companyId, type: type as any, name: name || type, content })
      .returning();
    res.json(created);
  }
});

export default router;
