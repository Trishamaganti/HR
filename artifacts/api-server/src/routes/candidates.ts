import { Router } from "express";
import { db } from "@workspace/db";
import { candidatesTable, applicationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateCandidateBody } from "@workspace/api-zod";

const router = Router();

async function mapCandidate(c: typeof candidatesTable.$inferSelect) {
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.candidateId, c.id));
  const skillsArr = c.skills ? JSON.parse(c.skills) : [];
  const education = c.education ? JSON.parse(c.education) : null;
  const emergencyContacts = c.emergencyContacts ? JSON.parse(c.emergencyContacts) : null;
  return {
    id: c.id,
    email: c.email,
    fullName: c.fullName,
    mobile: c.mobile,
    headline: c.headline,
    location: c.location,
    resumeUrl: c.resumeUrl,
    skills: skillsArr,
    experience: c.experience,
    linkedinUrl: c.linkedinUrl,
    githubUrl: c.githubUrl,
    avatarUrl: c.avatarUrl,
    totalApplications: apps.length,
    createdAt: c.createdAt.toISOString(),
    firstName: c.firstName,
    middleName: c.middleName,
    surname: c.surname,
    gender: c.gender,
    maritalStatus: c.maritalStatus,
    dateOfBirth: c.dateOfBirth,
    personalEmail: c.personalEmail,
    fathersName: c.fathersName,
    mothersName: c.mothersName,
    education,
    currentAddress: c.currentAddress,
    homeAddress: c.homeAddress,
    emergencyContacts,
    hasReference: c.hasReference,
    refereeName: c.refereeName,
    refereePhone: c.refereePhone,
    refereeEmail: c.refereeEmail,
    bankName: c.bankName,
    bankAccountName: c.bankAccountName,
    bankAccountNumber: c.bankAccountNumber,
    bankIfscCode: c.bankIfscCode,
    bankBranchName: c.bankBranchName,
  };
}

router.get("/candidates", async (req, res) => {
  const { userId } = req.query as Record<string, string | undefined>;
  let candidates = await db.select().from(candidatesTable).orderBy(candidatesTable.createdAt);
  if (userId) candidates = candidates.filter(c => c.userId === parseInt(userId));
  const result = await Promise.all(candidates.map(mapCandidate));
  res.json(result);
});

router.get("/candidates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id)).limit(1);
  if (!candidate) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapCandidate(candidate));
});

router.patch("/candidates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const d = parsed.data;
  const updates: Record<string, unknown> = {};

  // Basic fields
  if (d.fullName != null) updates.fullName = d.fullName;
  if (d.mobile != null) updates.mobile = d.mobile;
  if (d.headline != null) updates.headline = d.headline;
  if (d.location != null) updates.location = d.location;
  if (d.skills != null) updates.skills = JSON.stringify(d.skills);
  if (d.linkedinUrl != null) updates.linkedinUrl = d.linkedinUrl;
  if (d.githubUrl != null) updates.githubUrl = d.githubUrl;

  // Personal details
  if (d.firstName != null) updates.firstName = d.firstName;
  if (d.middleName != null) updates.middleName = d.middleName;
  if (d.surname != null) updates.surname = d.surname;
  if (d.gender != null) updates.gender = d.gender;
  if (d.maritalStatus != null) updates.maritalStatus = d.maritalStatus;
  if (d.dateOfBirth != null) updates.dateOfBirth = d.dateOfBirth;
  if (d.personalEmail != null) updates.personalEmail = d.personalEmail;
  if (d.fathersName != null) updates.fathersName = d.fathersName;
  if (d.mothersName != null) updates.mothersName = d.mothersName;

  // Education (object → JSON string)
  if (d.education != null) updates.education = JSON.stringify(d.education);

  // Addresses
  if (d.currentAddress != null) updates.currentAddress = d.currentAddress;
  if (d.homeAddress != null) updates.homeAddress = d.homeAddress;

  // Emergency contacts (array → JSON string)
  if (d.emergencyContacts != null) updates.emergencyContacts = JSON.stringify(d.emergencyContacts);

  // Reference
  if (d.hasReference != null) updates.hasReference = d.hasReference;
  if (d.refereeName != null) updates.refereeName = d.refereeName;
  if (d.refereePhone != null) updates.refereePhone = d.refereePhone;
  if (d.refereeEmail != null) updates.refereeEmail = d.refereeEmail;

  // Bank
  if (d.bankName != null) updates.bankName = d.bankName;
  if (d.bankAccountName != null) updates.bankAccountName = d.bankAccountName;
  if (d.bankAccountNumber != null) updates.bankAccountNumber = d.bankAccountNumber;
  if (d.bankIfscCode != null) updates.bankIfscCode = d.bankIfscCode;
  if (d.bankBranchName != null) updates.bankBranchName = d.bankBranchName;

  const [candidate] = await db.update(candidatesTable).set(updates).where(eq(candidatesTable.id, id)).returning();
  if (!candidate) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await mapCandidate(candidate));
});

export default router;
