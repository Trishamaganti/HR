import { Router } from "express";
import { db } from "@workspace/db";
import { applicationsTable, jobsTable, candidatesTable, companiesTable, emailLogsTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateApplicationBody, UpdateApplicationStatusBody, SendApplicationEmailBody, UpdateApplicationLinksBody } from "@workspace/api-zod";

const router = Router();

type AppStatus = "applied" | "ats_tracking" | "screening" | "shortlisted" | "interview" | "offer" | "conditional_offer" | "verification" | "final_offer" | "hired" | "rejected";

async function mapApplication(a: typeof applicationsTable.$inferSelect) {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, a.jobId)).limit(1);
  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, a.candidateId)).limit(1);
  const company = job ? await db.select().from(companiesTable).where(eq(companiesTable.id, job.companyId)).limit(1) : [];

  return {
    id: a.id,
    jobId: a.jobId,
    jobTitle: job?.title ?? null,
    companyName: company[0]?.name ?? null,
    candidateId: a.candidateId,
    candidateName: candidate?.fullName ?? null,
    candidateEmail: candidate?.email ?? null,
    status: a.status,
    atsScore: a.atsScore,
    matchPercent: a.matchPercent,
    notes: a.notes,
    meetingLink: a.meetingLink ?? null,
    calendarLink: a.calendarLink ?? null,
    appliedAt: a.appliedAt.toISOString(),
    interviewRound: a.interviewRound ?? 1,
    salaryOffer: a.salaryOffer ?? null,
    joiningDate: a.joiningDate ?? null,
    offerNotes: a.offerNotes ?? null,
  };
}

router.get("/applications", async (req, res) => {
  const { jobId, candidateId, userId, status } = req.query as Record<string, string | undefined>;
  let apps = await db.select().from(applicationsTable).orderBy(applicationsTable.appliedAt);

  if (jobId) apps = apps.filter(a => a.jobId === parseInt(jobId));
  if (status) apps = apps.filter(a => a.status === status);

  if (userId) {
    // Resolve candidate by userId first
    const [cand] = await db.select().from(candidatesTable).where(eq(candidatesTable.userId, parseInt(userId))).limit(1);
    if (!cand) { res.json([]); return; }
    apps = apps.filter(a => a.candidateId === cand.id);
  } else if (candidateId) {
    apps = apps.filter(a => a.candidateId === parseInt(candidateId));
  }

  const result = await Promise.all(apps.map(mapApplication));
  res.json(result);
});

router.post("/applications", async (req, res) => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const atsScore = Math.floor(Math.random() * 40) + 60;
  const matchPercent = Math.floor(Math.random() * 30) + 70;

  // Resolve real candidateId: frontend passes user.id (usersTable) not candidatesTable.id.
  // Try direct match first, then by userId, then auto-create using submitted details.
  let resolvedCandidateId = parsed.data.candidateId;
  const directMatch = await db.select().from(candidatesTable).where(eq(candidatesTable.id, resolvedCandidateId)).limit(1);
  if (!directMatch[0]) {
    const byUser = await db.select().from(candidatesTable).where(eq(candidatesTable.userId, resolvedCandidateId)).limit(1);
    if (!byUser[0]) {
      // Auto-create a candidate profile from the extra fields provided in the request
      const body = req.body as Record<string, unknown>;
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
      const cvUrl = typeof body.cvUrl === "string" ? body.cvUrl.trim() : undefined;
      if (!fullName || !email) {
        res.status(400).json({ error: "Please provide your name and email to apply." });
        return;
      }
      const [newCandidate] = await db.insert(candidatesTable).values({
        userId: resolvedCandidateId,
        email,
        fullName,
        mobile: phone ?? null,
        resumeUrl: cvUrl ?? null,
      }).returning();
      resolvedCandidateId = newCandidate.id;
    } else {
      // Update phone / CV if provided
      const body = req.body as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      if (typeof body.phone === "string" && body.phone.trim()) updates.mobile = body.phone.trim();
      if (typeof body.cvUrl === "string" && body.cvUrl.trim()) updates.resumeUrl = body.cvUrl.trim();
      if (Object.keys(updates).length) {
        await db.update(candidatesTable).set(updates).where(eq(candidatesTable.id, byUser[0].id));
      }
      resolvedCandidateId = byUser[0].id;
    }
  }

  const [app] = await db.insert(applicationsTable).values({
    jobId: parsed.data.jobId,
    candidateId: resolvedCandidateId,
    coverLetter: parsed.data.coverLetter ?? null,
    atsScore,
    matchPercent,
    status: "applied",
    interviewRound: 1,
  }).returning();
  res.status(201).json(await mapApplication(app));
});

router.get("/applications/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id)).limit(1);
  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapApplication(app));
});

router.patch("/applications/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateApplicationStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = {
    status: parsed.data.status as AppStatus,
    notes: parsed.data.notes ?? null,
  };
  if (parsed.data.interviewRound != null) updates.interviewRound = parsed.data.interviewRound;
  if (parsed.data.salaryOffer != null) updates.salaryOffer = parsed.data.salaryOffer;
  if (parsed.data.joiningDate != null) updates.joiningDate = parsed.data.joiningDate;
  if (parsed.data.offerNotes != null) updates.offerNotes = parsed.data.offerNotes;

  const [app] = await db.update(applicationsTable).set(updates).where(eq(applicationsTable.id, id)).returning();
  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapApplication(app));
});

router.post("/applications/:id/send-email", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = SendApplicationEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id)).limit(1);
  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, app.candidateId)).limit(1);

  const [emailLog] = await db.insert(emailLogsTable).values({
    applicationId: id,
    toEmail: candidate?.email ?? "unknown@candidate.com",
    subject: parsed.data.subject,
    body: parsed.data.body,
    sentBy: (req.headers["x-user-name"] as string) || null,
  }).returning();

  res.json({
    id: emailLog.id,
    applicationId: emailLog.applicationId,
    toEmail: emailLog.toEmail,
    subject: emailLog.subject,
    body: emailLog.body,
    sentBy: emailLog.sentBy,
    sentAt: emailLog.sentAt.toISOString(),
  });
});

router.patch("/applications/:id/links", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateApplicationLinksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.meetingLink !== undefined) updates.meetingLink = parsed.data.meetingLink;
  if (parsed.data.calendarLink !== undefined) updates.calendarLink = parsed.data.calendarLink;

  const [app] = await db.update(applicationsTable).set(updates).where(eq(applicationsTable.id, id)).returning();
  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapApplication(app));
});

router.post("/applications/:id/generate-employee", async (req, res) => {
  const id = parseInt(req.params.id);
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id)).limit(1);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, app.candidateId)).limit(1);

  if (!job || !candidate) {
    res.status(400).json({ error: "Job or candidate not found" });
    return;
  }

  const companyId = job.companyId;
  const existing = await db.select().from(employeesTable)
    .where(eq(employeesTable.companyId, companyId));
  const empCount = existing.length;
  const empCode = `EMP${(empCount + 1).toString().padStart(3, "0")}`;

  const now = new Date().toISOString().split("T")[0];
  const fullName = candidate.fullName;
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.length > 1 ? parts[parts.length - 1] : null;
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : null;

  const [emp] = await db.insert(employeesTable).values({
    employeeCode: empCode,
    fullName,
    firstName,
    middleName,
    lastName,
    email: candidate.email,
    companyId,
    department: job.department ?? "General",
    designation: job.title ?? null,
    jobTitle: job.title ?? null,
    basicSalary: app.salaryOffer ?? null,
    salary: app.salaryOffer ?? null,
    salaryUpdatedDate: now,
    joiningDate: app.joiningDate ?? now,
    positionUpdatedDate: now,
    status: "active",
    leaveBalance: 20,
  }).returning();

  await db.update(applicationsTable).set({ status: "hired" }).where(eq(applicationsTable.id, id));

  const mapEmployee = (e: typeof employeesTable.$inferSelect) => ({
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
    reportingManager: e.reportingManager,
    reportingManagerId: e.reportingManagerId,
    salary: e.salary,
    basicSalary: e.basicSalary,
    salaryUpdatedDate: e.salaryUpdatedDate,
    joiningDate: e.joiningDate,
    positionUpdatedDate: e.positionUpdatedDate,
    dob: e.dob,
    doe: e.doe,
    ofcEmail: e.ofcEmail,
    ofcNumber: e.ofcNumber,
    status: e.status,
    avatarUrl: e.avatarUrl,
    leaveBalance: e.leaveBalance,
  });

  res.status(201).json(mapEmployee(emp));
});

router.get("/applications/:id/emails", async (req, res) => {
  const id = parseInt(req.params.id);
  const emails = await db.select().from(emailLogsTable).where(eq(emailLogsTable.applicationId, id));
  res.json(emails.map(e => ({
    id: e.id,
    applicationId: e.applicationId,
    toEmail: e.toEmail,
    subject: e.subject,
    body: e.body,
    sentBy: e.sentBy,
    sentAt: e.sentAt.toISOString(),
  })));
});

export default router;
