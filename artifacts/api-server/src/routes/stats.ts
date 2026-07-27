import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, companiesTable, jobsTable, applicationsTable,
  employeesTable, attendanceTable, leavesTable
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/stats/hr-dashboard", async (req, res) => {
  const allEmployees = await db.select().from(employeesTable);
  const employees = allEmployees.filter(e => e.employeeCode !== "EMP000");
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.status, "open"));
  const applications = await db.select().from(applicationsTable);
  const pendingLeaves = await db.select().from(leavesTable).where(eq(leavesTable.status, "pending"));
  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = await db.select().from(attendanceTable).where(eq(attendanceTable.date, today));

  const stageCounts: Record<string, number> = {};
  for (const app of applications) {
    stageCounts[app.status] = (stageCounts[app.status] || 0) + 1;
  }

  const recentApps = applications
    .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime())
    .slice(0, 5);

  const recentAppsMapped = await Promise.all(recentApps.map(async a => {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, a.jobId)).limit(1);
    return {
      id: a.id,
      jobId: a.jobId,
      jobTitle: job?.title ?? null,
      companyName: null,
      candidateId: a.candidateId,
      candidateName: null,
      status: a.status,
      atsScore: a.atsScore,
      matchPercent: a.matchPercent,
      notes: a.notes,
      appliedAt: a.appliedAt.toISOString(),
    };
  }));

  res.json({
    totalEmployees: employees.length,
    openJobs: jobs.length,
    pendingApplications: applications.filter(a => a.status === "applied").length,
    pendingLeaves: pendingLeaves.length,
    presentToday: todayAttendance.filter(a => a.status === "present").length,
    absentToday: employees.length - todayAttendance.length,
    recruitmentByStage: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
    recentApplications: recentAppsMapped,
  });
});

router.get("/stats/employee-dashboard", async (req, res) => {
  res.json({
    leaveBalance: 18,
    attendanceDays: 22,
    payslipMonth: "May 2026",
    announcements: [
      "Annual Performance Review starts June 1st",
      "Team outing scheduled for May 30th",
      "New health insurance policy effective June 1st",
    ],
    upcomingHolidays: ["June 5 - World Environment Day", "June 15 - Company Anniversary"],
  });
});

router.get("/stats/super-admin", async (req, res) => {
  const companies = await db.select().from(companiesTable);
  const users = await db.select().from(usersTable);

  const planCounts: Record<string, number> = {};
  for (const c of companies) {
    const plan = c.plan ?? "starter";
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  }

  const recentCompanies = companies
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map(c => ({
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
    }));

  res.json({
    totalCompanies: companies.length,
    activeCompanies: companies.filter(c => c.status === "active").length,
    suspendedCompanies: companies.filter(c => c.status === "suspended").length,
    totalUsers: users.length,
    monthlyRevenue: companies.filter(c => c.plan === "starter").length * 29
      + companies.filter(c => c.plan === "growth").length * 99
      + companies.filter(c => c.plan === "enterprise").length * 499,
    planBreakdown: Object.entries(planCounts).map(([plan, count]) => ({ plan, count })),
    recentCompanies,
  });
});

router.get("/stats/recruitment-pipeline", async (req, res) => {
  const applications = await db.select().from(applicationsTable);
  const jobs = await db.select().from(jobsTable);

  const stageCounts: Record<string, number> = {};
  for (const app of applications) {
    stageCounts[app.status] = (stageCounts[app.status] || 0) + 1;
  }

  const topJobs = jobs
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map(j => ({
      id: j.id,
      title: j.title,
      companyId: j.companyId,
      companyName: null,
      department: j.department,
      employmentType: j.employmentType,
      experienceLevel: j.experienceLevel,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      skills: j.skills ? JSON.parse(j.skills) : [],
      description: j.description,
      location: j.location,
      workMode: j.workMode,
      openings: j.openings,
      deadline: j.deadline,
      status: j.status,
      applicationsCount: applications.filter(a => a.jobId === j.id).length,
      createdAt: j.createdAt.toISOString(),
    }));

  res.json({
    totalApplications: applications.length,
    hired: applications.filter(a => a.status === "hired").length,
    rejected: applications.filter(a => a.status === "rejected").length,
    stages: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
    topJobs,
  });
});

export default router;
