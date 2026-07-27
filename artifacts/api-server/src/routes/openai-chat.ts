import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, employeesTable, attendanceTable, applicationsTable, jobsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are iHR Assistant — a smart, friendly HR operations assistant built into the iHR Platform. You help HR managers, employees, and admins get things done faster through natural conversation.

You can help with:
- Attendance: punch in/out employees, check who is in today, view attendance records
- Interviews: list today's interviews, upcoming scheduled interviews
- Payslips: generate or summarise payslip data for employees
- Offer Letters: guide through generating an offer letter (collect name, role, salary, start date)
- Leave requests: check leave balances, approve/reject requests
- Employee info: look up employee details, department, status
- Reports: summarise headcount, department breakdown
- Rota: explain how to use the rota planner

When a user asks you to do something that requires an action (like punch in an employee), respond with a JSON action block at the END of your message in this exact format:
<action>{"type":"punch_in","employeeId":123,"location":"London Office"}</action>
<action>{"type":"punch_out","employeeId":123}</action>
<action>{"type":"open_page","page":"/hr/attendance"}</action>
<action>{"type":"open_page","page":"/hr/rota"}</action>
<action>{"type":"generate_payslip","employeeId":123,"month":"2024-01"}</action>

Always be concise, warm, and professional. If you don't know something, say so honestly. Format lists with bullet points. Use UK English spelling.

Today's date: ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

router.get("/openai/conversations", async (req, res) => {
  const all = await db.select().from(conversations).orderBy(desc(conversations.createdAt)).limit(20);
  res.json(all);
});

router.post("/openai/conversations", async (req, res) => {
  const { title } = req.body;
  const [conv] = await db.insert(conversations).values({ title: title || "New Chat" }).returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;

  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)
    .limit(40);

  // Gather live context
  const today = new Date().toISOString().split("T")[0];
  const [employees, todayAttendance, interviews] = await Promise.all([
    db.select().from(employeesTable).limit(100),
    db.select().from(attendanceTable).where(eq(attendanceTable.date, today)),
    db.select({ app: applicationsTable, job: jobsTable })
      .from(applicationsTable)
      .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
      .where(eq(applicationsTable.stage, "interview"))
      .limit(20),
  ]);

  const contextNote = `
LIVE DATA SNAPSHOT (${today}):
- Total employees: ${employees.length}
- Punched in today: ${todayAttendance.filter(a => a.punchIn && !a.punchOut).length}
- Already punched out today: ${todayAttendance.filter(a => a.punchOut).length}
- Interviews scheduled (stage=interview): ${interviews.length}
${interviews.length > 0 ? interviews.slice(0, 5).map(i => `  • ${i.job?.title ?? "Unknown Role"}`).join("\n") : ""}
- Employees list (first 10): ${employees.slice(0, 10).map(e => `${e.fullName} (ID:${e.id}, ${e.department ?? ""})`).join(", ")}
`;

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextNote },
    ...history.slice(0, -1).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  try {
    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) {
        fullResponse += c;
        res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err?.message ?? "AI error" })}\n\n`);
  }
  res.end();
});

export default router;
