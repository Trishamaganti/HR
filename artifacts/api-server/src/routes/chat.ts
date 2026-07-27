import { Router } from "express";
import { db } from "@workspace/db";
import {
  employeesTable,
  attendanceTable,
  applicationsTable,
  jobsTable,
  leavesTable,
  payrollTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, isNull } from "drizzle-orm";

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────
export type ChatRole = "hr" | "manager" | "admin" | "employee" | "candidate";

export type ChatSession = {
  intent: string | null;
  step: number;
  data: Record<string, unknown>;
};

export type ChatOption = {
  label: string;
  value: string;
  icon?: string;
};

export type ChatCard = {
  type: "employee" | "interview" | "payslip" | "leave" | "attendance" | "info";
  data: Record<string, unknown>;
};

export type ChatResponse = {
  message: string;
  messageType: "text" | "question" | "success" | "error" | "list";
  options?: ChatOption[];
  cards?: ChatCard[];
  session: ChatSession;
  navigate?: string;
  suggestions?: string[];
};

// ── Intent Detection ──────────────────────────────────────────────────────────
function detectIntent(text: string, role: ChatRole): string | null {
  const t = text.toLowerCase().trim();

  // Attendance / Punch
  if (/punch\s*(me\s*)?in|clock\s*(me\s*)?in|sign\s*(me\s*)?in|check\s*(me\s*)?in|arrived|start.?work|starting work|i.*arrived|i.*am in|mark.*present/.test(t)) return "punch_in";
  if (/punch\s*(me\s*)?out|clock\s*(me\s*)?out|sign\s*(me\s*)?out|check\s*(me\s*)?out|leaving|finish.?work|end.?shift|going home|i.*leaving|mark.*exit/.test(t)) return "punch_out";
  if (/who.*(punched|clocked|checked).?in|who.*present|who.*here|who.*office|attendance today|today.*attendance/.test(t)) return "attendance_today";
  if (/who.*not.*punch|who.*missing|not clocked|absent/.test(t)) return "absent_today";

  // Interviews
  if (/interview|scheduled.*today|today.*scheduled|today.*meeting/.test(t) && role !== "employee" && role !== "candidate") return "interviews_today";

  // Payslip
  if (/payslip|pay slip|pay stub|salary slip/.test(t)) {
    return role === "employee" ? "my_payslip" : "payslip";
  }

  // Offer letter
  if (/offer.?letter|job offer|employment offer/.test(t)) return "offer_letter";

  // Leave
  if (/(leave|holiday|time off|annual leave|sick leave)/.test(t)) {
    if (role === "employee") return "my_leave";
    return "leaves";
  }

  // Employees / headcount
  if (/(employee|staff|headcount|team|department|workforce)/.test(t) && role !== "employee") return "employees";

  // My profile / self
  if (/(my attendance|my record|my profile|my info)/.test(t) && role === "employee") return "my_attendance";

  // Recruitment
  if (/(recruitment|candidates|applicants|pipeline|hiring)/.test(t) && role !== "employee") return "recruitment";

  // Reports
  if (/(report|summary|stats|overview|breakdown|analytics)/.test(t)) return "report";

  // Help
  if (/(help|what can you|what do you|commands|options|menu)/.test(t)) return "help";

  return null;
}

// ── Workflow Engine ───────────────────────────────────────────────────────────
async function processMessage(
  message: string,
  role: ChatRole,
  userId: number,
  companyId: number | null,
  session: ChatSession
): Promise<ChatResponse> {
  const today = new Date().toISOString().split("T")[0];

  // ── Continuing a workflow ─────────────────────────────────────────────────
  if (session.intent && session.step > 0) {
    return continueWorkflow(message, role, userId, companyId, session, today);
  }

  // ── New intent detection ──────────────────────────────────────────────────
  const intent = detectIntent(message, role);

  if (!intent) {
    return {
      message: "I didn't quite catch that. I can help with attendance, payslips, interviews, leave requests, and more. Type **help** to see what I can do.",
      messageType: "text",
      session: { intent: null, step: 0, data: {} },
      suggestions: getRoleSuggestions(role).slice(0, 4),
    };
  }

  return startWorkflow(intent, role, userId, companyId, session, today);
}

// ── Start a workflow ──────────────────────────────────────────────────────────
async function startWorkflow(
  intent: string,
  role: ChatRole,
  userId: number,
  companyId: number | null,
  _session: ChatSession,
  today: string
): Promise<ChatResponse> {

  // ── HELP ─────────────────────────────────────────────────────────────────
  if (intent === "help") {
    const suggestions = getRoleSuggestions(role);
    return {
      message: "Here's what I can help you with:",
      messageType: "list",
      session: { intent: null, step: 0, data: {} },
      suggestions,
    };
  }

  // ── ATTENDANCE TODAY (HR) ────────────────────────────────────────────────
  if (intent === "attendance_today") {
    const records = await db
      .select({ emp: employeesTable, att: attendanceTable })
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(eq(attendanceTable.date, today));

    const punchedIn = records.filter((r) => r.att.punchIn && !r.att.punchOut);
    const punchedOut = records.filter((r) => r.att.punchOut);
    const total = await db.select().from(employeesTable)
      .where(companyId ? eq(employeesTable.companyId, companyId) : undefined as any);

    const cards: ChatCard[] = punchedIn.map((r) => ({
      type: "attendance",
      data: {
        name: r.emp?.fullName ?? "Unknown",
        department: r.emp?.department ?? "",
        punchIn: r.att.punchIn,
        status: "In Office",
      },
    }));

    return {
      message: `**Attendance for today (${today})**\n\n✅ Punched in: **${punchedIn.length}**\n✔️ Completed: **${punchedOut.length}**\n👥 Total employees: **${total.length}**`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      navigate: "/hr/attendance",
      suggestions: ["Who hasn't punched in yet?", "Punch in an employee", "Show all employees"],
    };
  }

  // ── ABSENT TODAY ─────────────────────────────────────────────────────────
  if (intent === "absent_today") {
    const allEmployees = await db.select().from(employeesTable)
      .where(companyId ? eq(employeesTable.companyId, companyId) : undefined as any);
    const presentToday = await db.select().from(attendanceTable)
      .where(eq(attendanceTable.date, today));
    const presentIds = new Set(presentToday.map((r) => r.employeeId));
    const absent = allEmployees.filter((e) => !presentIds.has(e.id));

    const cards: ChatCard[] = absent.slice(0, 10).map((e) => ({
      type: "employee",
      data: { name: e.fullName, department: e.department ?? "", designation: e.designation ?? "", status: "Absent" },
    }));

    return {
      message: absent.length === 0
        ? "🎉 All employees have punched in today!"
        : `**${absent.length} employee(s) haven't punched in yet today:**`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      suggestions: ["Punch in an employee", "View full attendance"],
    };
  }

  // ── PUNCH IN (HR workflow) ────────────────────────────────────────────────
  if (intent === "punch_in") {
    if (role === "employee") {
      // Self punch-in
      const emp = await db.select().from(employeesTable).where(eq(employeesTable.userId, userId)).limit(1);
      if (!emp[0]) {
        return { message: "I couldn't find your employee record. Please contact HR.", messageType: "error", session: { intent: null, step: 0, data: {} } };
      }
      const existing = await db.select().from(attendanceTable)
        .where(and(eq(attendanceTable.employeeId, emp[0].id), eq(attendanceTable.date, today))).limit(1);
      if (existing[0]?.punchIn) {
        return { message: `You already punched in today at **${existing[0].punchIn}**. Have a great day! 👋`, messageType: "text", session: { intent: null, step: 0, data: {} }, suggestions: ["Punch out", "My attendance"] };
      }
      const now = new Date().toTimeString().split(" ")[0].slice(0, 5);
      if (existing[0]) {
        await db.update(attendanceTable).set({ punchIn: now }).where(eq(attendanceTable.id, existing[0].id));
      } else {
        await db.insert(attendanceTable).values({ employeeId: emp[0].id, date: today, punchIn: now, status: "present" });
      }
      return { message: `✅ Punched in at **${now}**. Have a productive day, ${emp[0].fullName?.split(" ")[0]}!`, messageType: "success", session: { intent: null, step: 0, data: {} }, suggestions: ["My attendance", "My payslip", "Apply for leave"] };
    }

    // HR: ask which employee
    const employees = await db.select().from(employeesTable)
      .where(companyId ? eq(employeesTable.companyId, companyId) : undefined as any)
      .limit(20);
    return {
      message: "Which employee would you like to clock in?",
      messageType: "question",
      options: employees.map((e) => ({ label: e.fullName, value: String(e.id), icon: "👤" })),
      session: { intent: "punch_in", step: 1, data: {} },
    };
  }

  // ── PUNCH OUT (HR workflow) ───────────────────────────────────────────────
  if (intent === "punch_out") {
    if (role === "employee") {
      const emp = await db.select().from(employeesTable).where(eq(employeesTable.userId, userId)).limit(1);
      if (!emp[0]) return { message: "Couldn't find your employee record.", messageType: "error", session: { intent: null, step: 0, data: {} } };
      const existing = await db.select().from(attendanceTable)
        .where(and(eq(attendanceTable.employeeId, emp[0].id), eq(attendanceTable.date, today))).limit(1);
      if (!existing[0]?.punchIn) return { message: "You haven't punched in today yet.", messageType: "text", session: { intent: null, step: 0, data: {} }, suggestions: ["Punch in"] };
      if (existing[0].punchOut) return { message: `You already punched out at **${existing[0].punchOut}**. See you tomorrow!`, messageType: "text", session: { intent: null, step: 0, data: {} } };
      const now = new Date().toTimeString().split(" ")[0].slice(0, 5);
      await db.update(attendanceTable).set({ punchOut: now, status: "present" }).where(eq(attendanceTable.id, existing[0].id));
      return { message: `✅ Punched out at **${now}**. See you tomorrow, ${emp[0].fullName?.split(" ")[0]}! 👋`, messageType: "success", session: { intent: null, step: 0, data: {} } };
    }

    // HR: show employees who are currently in
    const records = await db.select({ emp: employeesTable, att: attendanceTable })
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(and(eq(attendanceTable.date, today)));
    const stillIn = records.filter((r) => r.att.punchIn && !r.att.punchOut && r.emp);

    if (stillIn.length === 0) return { message: "No employees are currently clocked in.", messageType: "text", session: { intent: null, step: 0, data: {} } };

    return {
      message: "Which employee would you like to clock out?",
      messageType: "question",
      options: stillIn.map((r) => ({ label: r.emp!.fullName, value: String(r.emp!.id), icon: "👤" })),
      session: { intent: "punch_out", step: 1, data: {} },
    };
  }

  // ── INTERVIEWS TODAY ─────────────────────────────────────────────────────
  if (intent === "interviews_today") {
    const interviews = await db.select({ app: applicationsTable, job: jobsTable })
      .from(applicationsTable)
      .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
      .where(eq(applicationsTable.status, "interview"))
      .limit(15);

    if (interviews.length === 0) {
      return { message: "No interviews are currently scheduled.", messageType: "text", session: { intent: null, step: 0, data: {} }, navigate: "/hr/recruitment" };
    }

    const cards: ChatCard[] = interviews.map((i) => ({
      type: "interview",
      data: {
        role: i.job?.title ?? "Unknown Role",
        candidate: `Candidate #${i.app.candidateId}`,
        stage: i.app.status,
        status: i.app.status,
      },
    }));

    return {
      message: `**${interviews.length} interview(s) in the pipeline:**`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      navigate: "/hr/recruitment",
      suggestions: ["View recruitment pipeline", "Show all applicants"],
    };
  }

  // ── PAYSLIP (HR) ─────────────────────────────────────────────────────────
  if (intent === "payslip") {
    const employees = await db.select().from(employeesTable)
      .where(companyId ? eq(employeesTable.companyId, companyId) : undefined as any)
      .limit(20);
    return {
      message: "Which employee's payslip would you like to view?",
      messageType: "question",
      options: employees.map((e) => ({ label: e.fullName, value: String(e.id) })),
      session: { intent: "payslip", step: 1, data: {} },
    };
  }

  // ── MY PAYSLIP (Employee) ─────────────────────────────────────────────────
  if (intent === "my_payslip") {
    const emp = await db.select().from(employeesTable).where(eq(employeesTable.userId, userId)).limit(1);
    if (!emp[0]) return { message: "Couldn't find your employee record.", messageType: "error", session: { intent: null, step: 0, data: {} } };

    const payslips = await db.select().from(payrollTable)
      .where(eq(payrollTable.employeeId, emp[0].id))
      .orderBy(desc(payrollTable.year), desc(payrollTable.month))
      .limit(6);

    if (payslips.length === 0) return { message: "No payslips found for your account. Please contact HR.", messageType: "text", session: { intent: null, step: 0, data: {} }, navigate: "/employee/payslips" };

    const cards: ChatCard[] = payslips.map((p) => ({
      type: "payslip",
      data: {
        period: `${p.month} ${p.year}`,
        gross: p.basicSalary,
        net: p.netSalary,
        status: p.status,
      },
    }));

    return {
      message: `Your last **${payslips.length}** payslip(s):`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      navigate: "/employee/payslips",
    };
  }

  // ── OFFER LETTER ─────────────────────────────────────────────────────────
  if (intent === "offer_letter") {
    return {
      message: "I'll help you draft an offer letter. What is the **candidate's full name**?",
      messageType: "question",
      session: { intent: "offer_letter", step: 1, data: {} },
    };
  }

  // ── LEAVES (HR) ──────────────────────────────────────────────────────────
  if (intent === "leaves") {
    const pending = await db.select({ leave: leavesTable, emp: employeesTable })
      .from(leavesTable)
      .leftJoin(employeesTable, eq(leavesTable.employeeId, employeesTable.id))
      .where(eq(leavesTable.status, "pending"))
      .limit(10);

    if (pending.length === 0) {
      return { message: "✅ No pending leave requests at the moment.", messageType: "text", session: { intent: null, step: 0, data: {} }, navigate: "/hr/leaves" };
    }

    const cards: ChatCard[] = pending.map((r) => ({
      type: "leave",
      data: {
        name: r.emp?.fullName ?? "Unknown",
        type: r.leave.leaveType,
        from: r.leave.startDate,
        to: r.leave.endDate,
        status: r.leave.status,
      },
    }));

    return {
      message: `**${pending.length} pending leave request(s):**`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      navigate: "/hr/leaves",
      suggestions: ["Approve all leaves", "View leave page"],
    };
  }

  // ── MY LEAVE (Employee) ───────────────────────────────────────────────────
  if (intent === "my_leave") {
    const emp = await db.select().from(employeesTable).where(eq(employeesTable.userId, userId)).limit(1);
    if (!emp[0]) return { message: "Couldn't find your employee record.", messageType: "error", session: { intent: null, step: 0, data: {} } };

    const myLeaves = await db.select().from(leavesTable)
      .where(eq(leavesTable.employeeId, emp[0].id))
      .orderBy(desc(leavesTable.startDate))
      .limit(5);

    if (myLeaves.length === 0) return { message: "You have no leave requests on record. You can apply for leave from the Leaves section.", messageType: "text", session: { intent: null, step: 0, data: {} }, navigate: "/employee/leaves" };

    const cards: ChatCard[] = myLeaves.map((l) => ({
      type: "leave",
      data: { type: l.leaveType, from: l.startDate, to: l.endDate, status: l.status },
    }));

    return {
      message: `Your recent leave requests:`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      navigate: "/employee/leaves",
    };
  }

  // ── EMPLOYEES ─────────────────────────────────────────────────────────────
  if (intent === "employees") {
    const employees = await db.select().from(employeesTable)
      .where(companyId ? eq(employeesTable.companyId, companyId) : undefined as any)
      .limit(20);

    const byDept: Record<string, number> = {};
    employees.forEach((e) => {
      const d = e.department ?? "Other";
      byDept[d] = (byDept[d] ?? 0) + 1;
    });

    const deptSummary = Object.entries(byDept).map(([d, c]) => `• ${d}: **${c}**`).join("\n");

    return {
      message: `**Headcount: ${employees.length} employees**\n\n${deptSummary}`,
      messageType: "list",
      session: { intent: null, step: 0, data: {} },
      navigate: "/hr/employees",
      suggestions: ["View employee list", "Who is present today?"],
    };
  }

  // ── RECRUITMENT ───────────────────────────────────────────────────────────
  if (intent === "recruitment") {
    const apps = await db.select({ app: applicationsTable, job: jobsTable })
      .from(applicationsTable)
      .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
      .limit(10);

    const byStage: Record<string, number> = {};
    apps.forEach((a) => {
      byStage[a.app.status] = (byStage[a.app.status] ?? 0) + 1;
    });

    const stageSummary = Object.entries(byStage).map(([s, c]) => `• ${s}: **${c}**`).join("\n");

    return {
      message: `**Recruitment Pipeline (${apps.length} applications)**\n\n${stageSummary || "No applications yet."}`,
      messageType: "list",
      session: { intent: null, step: 0, data: {} },
      navigate: "/hr/recruitment",
      suggestions: ["Show interviews today", "View all jobs"],
    };
  }

  // ── MY ATTENDANCE ─────────────────────────────────────────────────────────
  if (intent === "my_attendance") {
    const emp = await db.select().from(employeesTable).where(eq(employeesTable.userId, userId)).limit(1);
    if (!emp[0]) return { message: "Couldn't find your employee record.", messageType: "error", session: { intent: null, step: 0, data: {} } };

    const recent = await db.select().from(attendanceTable)
      .where(eq(attendanceTable.employeeId, emp[0].id))
      .orderBy(desc(attendanceTable.date))
      .limit(5);

    const cards: ChatCard[] = recent.map((a) => ({
      type: "attendance",
      data: { date: a.date, punchIn: a.punchIn ?? "—", punchOut: a.punchOut ?? "—", status: a.status },
    }));

    return {
      message: `Your recent attendance:`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      navigate: "/employee/attendance",
    };
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  if (intent === "report") {
    const [employees, todayAtt, pending] = await Promise.all([
      db.select().from(employeesTable).where(companyId ? eq(employeesTable.companyId, companyId) : undefined as any),
      db.select().from(attendanceTable).where(eq(attendanceTable.date, today)),
      db.select().from(leavesTable).where(eq(leavesTable.status, "pending")),
    ]);

    const inToday = todayAtt.filter((a) => a.punchIn && !a.punchOut).length;

    return {
      message: `**Daily HR Summary — ${today}**\n\n👥 Total Staff: **${employees.length}**\n✅ In Office Now: **${inToday}**\n📋 Pending Leaves: **${pending.length}**`,
      messageType: "text",
      session: { intent: null, step: 0, data: {} },
      navigate: "/hr",
      suggestions: ["Who is present today?", "View pending leaves", "Show recruitment pipeline"],
    };
  }

  return {
    message: "I'm not sure how to handle that. Type **help** to see what I can do.",
    messageType: "text",
    session: { intent: null, step: 0, data: {} },
    suggestions: getRoleSuggestions(role).slice(0, 4),
  };
}

// ── Continue a multi-step workflow ────────────────────────────────────────────
async function continueWorkflow(
  message: string,
  role: ChatRole,
  userId: number,
  companyId: number | null,
  session: ChatSession,
  today: string
): Promise<ChatResponse> {
  const { intent, step, data } = session;

  // ── PUNCH IN Step 1: employee selected ───────────────────────────────────
  if (intent === "punch_in" && step === 1) {
    const employeeId = parseInt(message);
    const emp = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);
    if (!emp[0]) return { message: "Employee not found. Please try again.", messageType: "error", session: { intent: null, step: 0, data: {} } };

    const existing = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, today))).limit(1);
    if (existing[0]?.punchIn) {
      return { message: `${emp[0].fullName} already punched in today at **${existing[0].punchIn}**.`, messageType: "text", session: { intent: null, step: 0, data: {} } };
    }

    const now = new Date().toTimeString().split(" ")[0].slice(0, 5);
    if (existing[0]) {
      await db.update(attendanceTable).set({ punchIn: now }).where(eq(attendanceTable.id, existing[0].id));
    } else {
      await db.insert(attendanceTable).values({ employeeId, date: today, punchIn: now, status: "present" });
    }

    return {
      message: `✅ **${emp[0].fullName}** clocked in at **${now}**.`,
      messageType: "success",
      session: { intent: null, step: 0, data: {} },
      suggestions: ["Clock in another employee", "Who is present today?", "Clock someone out"],
    };
  }

  // ── PUNCH OUT Step 1: employee selected ──────────────────────────────────
  if (intent === "punch_out" && step === 1) {
    const employeeId = parseInt(message);
    const emp = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);
    if (!emp[0]) return { message: "Employee not found.", messageType: "error", session: { intent: null, step: 0, data: {} } };

    const existing = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, today))).limit(1);
    if (!existing[0]?.punchIn) return { message: `${emp[0].fullName} hasn't punched in today.`, messageType: "text", session: { intent: null, step: 0, data: {} } };
    if (existing[0].punchOut) return { message: `${emp[0].fullName} already punched out at **${existing[0].punchOut}**.`, messageType: "text", session: { intent: null, step: 0, data: {} } };

    const now = new Date().toTimeString().split(" ")[0].slice(0, 5);
    await db.update(attendanceTable).set({ punchOut: now, status: "present" }).where(eq(attendanceTable.id, existing[0].id));

    return {
      message: `✅ **${emp[0].fullName}** clocked out at **${now}**.`,
      messageType: "success",
      session: { intent: null, step: 0, data: {} },
      suggestions: ["Clock out another employee", "Who is still in office?"],
    };
  }

  // ── PAYSLIP Step 1: employee selected ────────────────────────────────────
  if (intent === "payslip" && step === 1) {
    const employeeId = parseInt(message);
    const emp = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);
    if (!emp[0]) return { message: "Employee not found.", messageType: "error", session: { intent: null, step: 0, data: {} } };

    const payslips = await db.select().from(payrollTable)
      .where(eq(payrollTable.employeeId, employeeId))
      .orderBy(desc(payrollTable.year), desc(payrollTable.month))
      .limit(6);

    if (payslips.length === 0) {
      return { message: `No payslips found for **${emp[0].fullName}**.`, messageType: "text", session: { intent: null, step: 0, data: {} }, navigate: "/hr/payroll" };
    }

    const cards: ChatCard[] = payslips.map((p) => ({
      type: "payslip",
      data: {
        name: emp[0].fullName,
        period: `${p.month} ${p.year}`,
        gross: p.basicSalary,
        net: p.netSalary,
        status: p.status,
      },
    }));

    return {
      message: `**Payslips for ${emp[0].fullName}:**`,
      messageType: "list",
      cards,
      session: { intent: null, step: 0, data: {} },
      navigate: "/hr/payroll",
    };
  }

  // ── OFFER LETTER Steps ────────────────────────────────────────────────────
  if (intent === "offer_letter") {
    if (step === 1) {
      return {
        message: `Got it — **${message}**. What is the **job title / role** being offered?`,
        messageType: "question",
        session: { intent: "offer_letter", step: 2, data: { candidateName: message } },
      };
    }
    if (step === 2) {
      return {
        message: `Great — **${message}**. What is the **annual salary** (e.g. £35,000)?`,
        messageType: "question",
        session: { intent: "offer_letter", step: 3, data: { ...data, role: message } },
      };
    }
    if (step === 3) {
      return {
        message: `Perfect. What is the **proposed start date**?`,
        messageType: "question",
        session: { intent: "offer_letter", step: 4, data: { ...data, salary: message } },
        options: [
          { label: "1st of next month", value: getFirstOfNextMonth() },
          { label: "In 2 weeks", value: getDateInDays(14) },
          { label: "In 4 weeks", value: getDateInDays(28) },
        ],
      };
    }
    if (step === 4) {
      const { candidateName, role: jobRole, salary } = data as any;
      const startDate = message;
      const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

      const letter = `**OFFER LETTER**\n\nDate: ${today}\n\nDear **${candidateName}**,\n\nWe are delighted to offer you the position of **${jobRole}** with our organisation.\n\n📌 **Role:** ${jobRole}\n💷 **Salary:** ${salary} per annum\n📅 **Start Date:** ${startDate}\n\nThis offer is subject to satisfactory references. Please confirm your acceptance within 5 working days.\n\nWe look forward to welcoming you to the team.\n\nKind regards,\n**HR Department**`;

      return {
        message: letter,
        messageType: "success",
        session: { intent: null, step: 0, data: {} },
        suggestions: ["Draft another offer letter", "View employees", "View recruitment"],
      };
    }
  }

  // Fallback: clear session
  return {
    message: "Something went wrong. Let's start fresh.",
    messageType: "text",
    session: { intent: null, step: 0, data: {} },
  };
}

// ── Role-specific suggestions ─────────────────────────────────────────────────
function getRoleSuggestions(role: ChatRole): string[] {
  if (role === "employee") {
    return [
      "Punch in",
      "Punch out",
      "My payslip",
      "My leave",
      "My attendance",
    ];
  }
  if (role === "candidate") {
    return [
      "My applications",
      "Help",
    ];
  }
  return [
    "Who is present today?",
    "What interviews are scheduled?",
    "Punch in an employee",
    "Generate a payslip",
    "Draft an offer letter",
    "Show pending leaves",
    "Headcount report",
    "Recruitment pipeline",
  ];
}

function getFirstOfNextMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0];
}

function getDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post("/chat/message", async (req, res) => {
  try {
    const { message, role, userId, companyId, session } = req.body as {
      message: string;
      role: ChatRole;
      userId: number;
      companyId: number | null;
      session: ChatSession;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const response = await processMessage(
      message.trim(),
      role ?? "employee",
      userId ?? 0,
      companyId ?? null,
      session ?? { intent: null, step: 0, data: {} }
    );

    res.json(response);
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

router.get("/chat/suggestions", async (req, res) => {
  const role = (req.query.role as ChatRole) ?? "employee";
  res.json({ suggestions: getRoleSuggestions(role) });
});

export default router;
