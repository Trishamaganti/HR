import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, companiesTable, employeesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { LoginBody, RegisterCompanyBody, RegisterCandidateBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

// In-memory OTP store — good enough for dev/demo; replace with DB for production
const otpStore = new Map<string, { code: string; expiresAt: number }>();

router.post("/auth/send-otp", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const key = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(key, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  console.log(`[OTP] ${key} → ${code}`);
  // In production this would email the code; for demo we return it in the response
  res.json({ message: "OTP sent to your email address", otp: code });
});

router.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body ?? {};
  if (!email || !otp) {
    res.status(400).json({ error: "Email and OTP are required" });
    return;
  }
  const key = email.toLowerCase().trim();
  const record = otpStore.get(key);
  if (!record) {
    res.status(400).json({ error: "No OTP was requested for this email. Please request a new one." });
    return;
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    res.status(400).json({ error: "OTP has expired. Please request a new one." });
    return;
  }
  if (record.code !== otp.trim()) {
    res.status(400).json({ error: "Incorrect OTP. Please try again." });
    return;
  }
  res.json({ verified: true });
});

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ihr_salt_2024").digest("hex");
}

function generateToken(userId: number): string {
  return crypto.createHash("sha256").update(`${userId}_${Date.now()}_ihr`).digest("hex");
}

router.post("/auth/login", async (req, res) => {
  const rawBody = req.body;
  const parsed = LoginBody.safeParse(rawBody);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { identifier: rawIdentifier, password } = parsed.data;
  const identifier = rawIdentifier.toLowerCase().trim();
  const passwordHash = hashPassword(password);

  // Debug: log identifier and hash (never log raw password)
  console.log(`[login] identifier="${identifier}" pwdLen=${password.length} hash=${passwordHash.slice(0, 8)}`);

  const user = await db.select().from(usersTable).where(
    or(
      eq(usersTable.email, identifier),
      eq(usersTable.employeeId, identifier)
    )
  ).limit(1);

  const storedHash = user[0]?.passwordHash ?? "(not found)";
  console.log(`[login] found=${!!user[0]} storedHash=${storedHash.slice(0, 8)} match=${user[0]?.passwordHash === passwordHash}`);

  if (!user[0] || user[0].passwordHash !== passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const u = user[0];
  const token = generateToken(u.id);

  res.json({
    token,
    user: {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      employeeId: u.employeeId,
      companyId: u.companyId,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt.toISOString(),
    },
    organizations: null,
  });
});

router.post("/auth/register-company", async (req, res) => {
  const parsed = RegisterCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { companyName, email, adminName, password, industry, companySize, mobile } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const slug = companyName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [company] = await db.insert(companiesTable).values({
    name: companyName,
    slug,
    industry,
    companySize: companySize ?? null,
    status: "active",
    plan: "starter",
  }).returning();

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash: hashPassword(password),
    fullName: adminName,
    role: "admin",
    companyId: company.id,
  }).returning();

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId,
      companyId: user.companyId,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    },
    organizations: null,
  });
});

router.post("/auth/register-candidate", async (req, res) => {
  const parsed = RegisterCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password, fullName, mobile } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash: hashPassword(password),
    fullName,
    role: "candidate",
  }).returning();

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId,
      companyId: user.companyId,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    },
    organizations: null,
  });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ id: 1, email: "demo@ihr.com", role: "hr", fullName: "Demo User", employeeId: null, companyId: 1, avatarUrl: null, createdAt: new Date().toISOString() });
});

export default router;
