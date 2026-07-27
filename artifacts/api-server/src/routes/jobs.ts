import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateJobBody, UpdateJobBody } from "@workspace/api-zod";

const router = Router();

async function mapJob(j: typeof jobsTable.$inferSelect, companyName?: string | null) {
  const skillsArr = j.skills ? JSON.parse(j.skills) : [];
  return {
    id: j.id,
    title: j.title,
    companyId: j.companyId,
    companyName: companyName ?? null,
    department: j.department,
    employmentType: j.employmentType,
    experienceLevel: j.experienceLevel,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    skills: skillsArr,
    description: j.description,
    location: j.location,
    workMode: j.workMode,
    openings: j.openings,
    deadline: j.deadline,
    status: j.status,
    applicationsCount: null,
    createdAt: j.createdAt.toISOString(),
  };
}

router.get("/jobs", async (req, res) => {
  const { companySlug, department, location } = req.query as Record<string, string | undefined>;
  let jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);

  if (department) jobs = jobs.filter(j => j.department === department);
  if (location) jobs = jobs.filter(j => j.location?.toLowerCase().includes(location.toLowerCase()));

  const companies = await db.select().from(companiesTable);
  const companyMap = new Map(companies.map(c => [c.id, c.name]));

  const result = await Promise.all(jobs.map(j => mapJob(j, companyMap.get(j.companyId))));
  res.json(result);
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data;
  const [job] = await db.insert(jobsTable).values({
    title: data.title,
    companyId: data.companyId,
    department: data.department,
    employmentType: (data.employmentType as "full_time" | "part_time" | "contract" | "internship") ?? "full_time",
    experienceLevel: data.experienceLevel ?? null,
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    skills: data.skills ? JSON.stringify(data.skills) : null,
    description: data.description ?? null,
    location: data.location ?? null,
    workMode: (data.workMode as "remote" | "hybrid" | "onsite" | undefined) ?? null,
    openings: data.openings ?? 1,
    deadline: data.deadline ?? null,
    status: "open",
  }).returning();
  res.status(201).json(await mapJob(job));
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
  if (!job) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId)).limit(1);
  res.json(await mapJob(job, company?.name));
});

router.patch("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.title != null) updates.title = parsed.data.title;
  if (parsed.data.department != null) updates.department = parsed.data.department;
  if (parsed.data.status != null) updates.status = parsed.data.status;
  if (parsed.data.description != null) updates.description = parsed.data.description;
  if (parsed.data.deadline != null) updates.deadline = parsed.data.deadline;

  const [job] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, id)).returning();
  if (!job) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapJob(job));
});

router.delete("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(jobsTable).where(eq(jobsTable.id, id));
  res.status(204).send();
});

export default router;
