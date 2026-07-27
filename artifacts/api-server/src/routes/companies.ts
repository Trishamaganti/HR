import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCompanyBody, UpdateCompanyBody } from "@workspace/api-zod";

const router = Router();

function mapCompany(c: typeof companiesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    industry: c.industry,
    companySize: c.companySize,
    logoUrl: c.logoUrl,
    website: c.website,
    status: c.status,
    plan: c.plan,
    employeeCount: c.employeeCount,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/companies", async (req, res) => {
  const companies = await db.select().from(companiesTable).orderBy(companiesTable.createdAt);
  res.json(companies.map(mapCompany));
});

router.post("/companies", async (req, res) => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [company] = await db.insert(companiesTable).values({
    ...parsed.data,
    companySize: parsed.data.companySize ?? null,
    website: parsed.data.website ?? null,
    plan: parsed.data.plan ?? "starter",
  }).returning();
  res.status(201).json(mapCompany(company));
});

router.get("/companies/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1);
  if (!company) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapCompany(company));
});

router.patch("/companies/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.industry != null) updates.industry = parsed.data.industry;
  if (parsed.data.companySize != null) updates.companySize = parsed.data.companySize;
  if (parsed.data.website != null) updates.website = parsed.data.website;
  if (parsed.data.status != null) updates.status = parsed.data.status;
  if (parsed.data.plan != null) updates.plan = parsed.data.plan;

  const [company] = await db.update(companiesTable).set(updates).where(eq(companiesTable.id, id)).returning();
  if (!company) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapCompany(company));
});

export default router;
