import { Router } from "express";
import { db } from "@workspace/db";
import {
  onboardingRequestsTable,
  candidatesTable,
  applicationsTable,
  companiesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const OFFER_STATUSES = ["offer", "conditional_offer", "verification", "final_offer", "hired"] as const;

router.get("/candidates/with-offers", async (_req, res) => {
  const offerApps = await db.select().from(applicationsTable);
  const filtered = offerApps.filter((a) => (OFFER_STATUSES as readonly string[]).includes(a.status));

  const candidateIds = [...new Set(filtered.map((a) => a.candidateId))];
  if (candidateIds.length === 0) {
    res.json([]);
    return;
  }

  const candidates = await db.select().from(candidatesTable).where(inArray(candidatesTable.id, candidateIds));

  const result = candidates.map((c) => {
    const app = filtered.find((a) => a.candidateId === c.id);
    return {
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      mobile: c.mobile,
      headline: c.headline,
      avatarUrl: c.avatarUrl,
      applicationStatus: app?.status ?? null,
      salaryOffer: app?.salaryOffer ?? null,
    };
  });

  res.json(result);
});

router.get("/onboarding-requests", async (req, res) => {
  const { companyId, candidateId } = req.query as Record<string, string | undefined>;
  let requests = await db.select().from(onboardingRequestsTable).orderBy(onboardingRequestsTable.createdAt);
  if (companyId) requests = requests.filter((r) => r.companyId === parseInt(companyId));
  if (candidateId) requests = requests.filter((r) => r.candidateId === parseInt(candidateId));
  res.json(
    requests.map((r) => ({
      ...r,
      requestedFields: r.requestedFields ? JSON.parse(r.requestedFields) : [],
      sharedData: r.sharedData ? JSON.parse(r.sharedData) : null,
    }))
  );
});

router.post("/onboarding-requests", async (req, res) => {
  const { type, companyId, requestedByUserId, candidateId, inviteeEmail, inviteeName, requestedFields, message } =
    req.body;

  if (!type || !companyId || !requestedByUserId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");

  const [request] = await db
    .insert(onboardingRequestsTable)
    .values({
      token,
      type,
      status: "pending",
      companyId: parseInt(companyId),
      requestedByUserId: parseInt(requestedByUserId),
      candidateId: candidateId ? parseInt(candidateId) : null,
      inviteeEmail: inviteeEmail ?? null,
      inviteeName: inviteeName ?? null,
      requestedFields: requestedFields ? JSON.stringify(requestedFields) : null,
      message: message ?? null,
    })
    .returning();

  res.status(201).json({
    ...request,
    requestedFields: requestedFields ?? [],
    sharedData: null,
  });
});

router.get("/onboarding-requests/:token", async (req, res) => {
  const { token } = req.params;
  const [request] = await db
    .select()
    .from(onboardingRequestsTable)
    .where(eq(onboardingRequestsTable.token, token))
    .limit(1);

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, request.companyId)).limit(1);

  let candidate = null;
  if (request.candidateId) {
    const [c] = await db
      .select()
      .from(candidatesTable)
      .where(eq(candidatesTable.id, request.candidateId))
      .limit(1);
    if (c) {
      candidate = {
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        mobile: c.mobile,
        firstName: c.firstName,
        middleName: c.middleName,
        surname: c.surname,
        gender: c.gender,
        maritalStatus: c.maritalStatus,
        dateOfBirth: c.dateOfBirth,
        personalEmail: c.personalEmail,
        fathersName: c.fathersName,
        mothersName: c.mothersName,
        education: c.education ? JSON.parse(c.education) : null,
        currentAddress: c.currentAddress,
        homeAddress: c.homeAddress,
        emergencyContacts: c.emergencyContacts ? JSON.parse(c.emergencyContacts) : null,
        hasReference: c.hasReference,
        refereeName: c.refereeName,
        refereePhone: c.refereePhone,
        refereeEmail: c.refereeEmail,
        bankName: c.bankName,
        bankAccountName: c.bankAccountName,
        bankAccountNumber: c.bankAccountNumber,
        bankIfscCode: c.bankIfscCode,
        bankBranchName: c.bankBranchName,
        experience: c.experience,
        resumeUrl: c.resumeUrl,
        skills: c.skills ? JSON.parse(c.skills) : [],
      };
    }
  }

  res.json({
    ...request,
    requestedFields: request.requestedFields ? JSON.parse(request.requestedFields) : [],
    sharedData: request.sharedData ? JSON.parse(request.sharedData) : null,
    company: company ? { id: company.id, name: company.name } : null,
    candidate,
  });
});

router.patch("/onboarding-requests/:token/respond", async (req, res) => {
  const { token } = req.params;
  const { sharedData, status } = req.body;

  const [request] = await db
    .select()
    .from(onboardingRequestsTable)
    .where(eq(onboardingRequestsTable.token, token))
    .limit(1);

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  const updates: Record<string, unknown> = { status: status ?? "completed" };
  if (sharedData) updates.sharedData = JSON.stringify(sharedData);

  const [updated] = await db
    .update(onboardingRequestsTable)
    .set(updates)
    .where(eq(onboardingRequestsTable.token, token))
    .returning();

  res.json({
    ...updated,
    requestedFields: updated.requestedFields ? JSON.parse(updated.requestedFields) : [],
    sharedData: updated.sharedData ? JSON.parse(updated.sharedData) : null,
  });
});

export default router;
