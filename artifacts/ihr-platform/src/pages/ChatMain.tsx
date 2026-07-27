import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import {
  Send, Zap, X, CheckCircle2, AlertCircle, ArrowRight,
  ChevronRight, Users, Calendar, FileText, CreditCard,
  Clock, RotateCcw, Building2, Search,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type ChatSession = { intent: string | null; step: number; data: Record<string, unknown> };
type ChatOption = { label: string; value: string; icon?: string };
type ChatCard = { type: string; data: Record<string, unknown> };

type Message = {
  id: string;
  from: "user" | "bot";
  text: string;
  messageType?: "text" | "question" | "success" | "error" | "list";
  options?: ChatOption[];
  cards?: ChatCard[];
  suggestions?: string[];
  navigate?: string;
  ts: Date;
};

// ── Suggestion definitions (shown in grid) ────────────────────────────────────
const HR_SUGGESTIONS = [
  { icon: Users, text: "Who is punched in today?", label: "Attendance", color: "bg-violet-100 text-violet-600" },
  { icon: Calendar, text: "What interviews are scheduled today?", label: "Recruitment", color: "bg-blue-100 text-blue-600" },
  { icon: FileText, text: "Generate a payslip for an employee", label: "Payroll", color: "bg-green-100 text-green-600" },
  { icon: Clock, text: "Clock in John Smith at London Office", label: "Clock In", color: "bg-orange-100 text-orange-600" },
  { icon: FileText, text: "Draft an offer letter for a new hire", label: "Offer Letter", color: "bg-pink-100 text-pink-600" },
  { icon: Users, text: "Show me a headcount breakdown by department", label: "Reports", color: "bg-purple-100 text-purple-600" },
  { icon: RotateCcw, text: "Who hasn't punched out yet today?", label: "Attendance", color: "bg-amber-100 text-amber-600" },
  { icon: Calendar, text: "How many employees are on leave this week?", label: "Leave", color: "bg-cyan-100 text-cyan-600" },
];

const EMPLOYEE_SUGGESTIONS = [
  { icon: Clock, text: "Punch me in", label: "Clock In", color: "bg-green-100 text-green-600" },
  { icon: Clock, text: "Punch me out", label: "Clock Out", color: "bg-red-100 text-red-600" },
  { icon: CreditCard, text: "Show my payslip", label: "Payslip", color: "bg-blue-100 text-blue-600" },
  { icon: FileText, text: "My leave requests", label: "Leave", color: "bg-violet-100 text-violet-600" },
  { icon: Calendar, text: "My attendance this month", label: "Attendance", color: "bg-orange-100 text-orange-600" },
];

const CANDIDATE_SUGGESTIONS = [
  { icon: Building2, text: "Show my applications", label: "Applications", color: "bg-blue-100 text-blue-600" },
  { icon: Search, text: "Help", label: "Help", color: "bg-gray-100 text-gray-600" },
];

// ── Card renderers ─────────────────────────────────────────────────────────────
function s(v: unknown, fallback = ""): string {
  return v != null ? String(v) : fallback;
}

function DataCard({ card }: { card: ChatCard }) {
  const d = card.data;
  const base = "bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 text-sm space-y-1";
  switch (card.type) {
    case "attendance":
      return (
        <div className={base}>
          <p className="font-semibold text-gray-800">{s(d.name)}</p>
          {d.department != null && <p className="text-gray-400 text-xs">{s(d.department)}</p>}
          <div className="flex gap-3 text-xs mt-1">
            {d.punchIn != null && <span className="text-emerald-600 font-medium">🟢 {s(d.punchIn)}</span>}
            {d.punchOut != null && <span className="text-red-500 font-medium">🔴 {s(d.punchOut)}</span>}
            {d.date != null && <span className="text-gray-400">{s(d.date)}</span>}
            {d.status != null && <span className={cn("font-medium", d.status === "Absent" ? "text-red-500" : "text-emerald-600")}>{s(d.status)}</span>}
          </div>
        </div>
      );
    case "employee":
      return (
        <div className={base}>
          <p className="font-semibold text-gray-800">{s(d.name)}</p>
          <p className="text-gray-400 text-xs">{s(d.designation)} · {s(d.department)}</p>
          {d.status != null && <span className={cn("text-xs font-medium", d.status === "Absent" ? "text-red-500" : "text-emerald-600")}>{s(d.status)}</span>}
        </div>
      );
    case "payslip":
      return (
        <div className={base}>
          {d.name != null && <p className="font-semibold text-gray-800">{s(d.name)}</p>}
          <p className="text-gray-400 text-xs">{s(d.period)}</p>
          <div className="flex gap-4 text-xs">
            <span className="text-gray-600">Gross: <strong>£{Number(d.gross ?? 0).toLocaleString()}</strong></span>
            <span className="text-emerald-600">Net: <strong>£{Number(d.net ?? 0).toLocaleString()}</strong></span>
          </div>
          <span className={cn("text-xs capitalize font-medium", d.status === "paid" ? "text-emerald-600" : "text-amber-500")}>{s(d.status)}</span>
        </div>
      );
    case "interview":
      return (
        <div className={base}>
          <p className="font-semibold text-gray-800">{s(d.role)}</p>
          <p className="text-gray-400 text-xs">{s(d.candidate)}</p>
          <span className="text-xs text-violet-600 font-medium capitalize">{s(d.stage ?? d.status)}</span>
        </div>
      );
    case "leave":
      return (
        <div className={base}>
          {d.name != null && <p className="font-semibold text-gray-800">{s(d.name)}</p>}
          <p className="text-gray-600 capitalize text-xs">{s(d.type)} leave</p>
          <p className="text-gray-400 text-xs">{s(d.from)} → {s(d.to)}</p>
          <span className={cn("text-xs capitalize font-medium",
            d.status === "approved" ? "text-emerald-600" : d.status === "rejected" ? "text-red-500" : "text-amber-500"
          )}>{s(d.status)}</span>
        </div>
      );
    default:
      return null;
  }
}

// ── Markdown-lite ──────────────────────────────────────────────────────────────
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );
        if (line.startsWith("•") || line.startsWith("-")) {
          return <li key={i} className="ml-4 list-disc text-sm">{parts}</li>;
        }
        if (line.trim() === "") return <br key={i} />;
        return <span key={i} className="block text-sm leading-relaxed">{parts}</span>;
      })}
    </>
  );
}

// ── Time formatter ─────────────────────────────────────────────────────────────
function fmt(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ChatMain() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<ChatSession>({ intent: null, step: 0, data: {} });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = user?.role === "employee"
    ? EMPLOYEE_SUGGESTIONS
    : user?.role === "candidate"
    ? CANDIDATE_SUGGESTIONS
    : HR_SUGGESTIONS;

  const roleName = user?.fullName?.split(" ")[0] ?? "there";
  const roleGreet: Record<string, string> = {
    hr: "HR",
    manager: "Manager",
    admin: "Admin",
    employee: roleName,
    candidate: roleName,
    super_admin: "Admin",
  };

  // Initial greeting + handle prefill from dashboard chat bar
  useEffect(() => {
    if (!user) return;
    const greet = roleGreet[user.role] ?? roleName;
    const greetMsg: Message = {
      id: "greet",
      from: "bot",
      text: `Hello, ${greet}! 👋\n\nI'm your iHR Assistant. Ask me anything about your ${
        ["hr","manager","admin"].includes(user.role)
          ? "team, attendance, payroll"
          : user.role === "employee"
          ? "attendance, payslips, or leave"
          : "applications"
      }, or let me help you get things done faster.\n\nTap **⚡** below to see what I can do.`,
      messageType: "text",
      ts: new Date(),
    };
    setMessages([greetMsg]);

    // If navigated from dashboard chat bar, auto-send the prefilled message
    const prefill = sessionStorage.getItem("ihr_chat_prefill");
    if (prefill) {
      sessionStorage.removeItem("ihr_chat_prefill");
      // Small delay to let greeting render first
      setTimeout(() => sendMessage(prefill), 400);
    }
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !user) return;
    setShowSuggestions(false);

    const userMsg: Message = { id: Date.now().toString(), from: "user", text, ts: new Date() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(`${getApiUrl()}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          role: user.role,
          userId: user.id,
          companyId: user.companyId ?? null,
          session,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Error");

      setSession(data.session);
      setMessages((p) => [...p, {
        id: Date.now().toString() + "_bot",
        from: "bot",
        text: data.message,
        messageType: data.messageType,
        options: data.options,
        cards: data.cards,
        suggestions: data.suggestions,
        navigate: data.navigate,
        ts: new Date(),
      }]);
    } catch (err: any) {
      setMessages((p) => [...p, {
        id: Date.now().toString() + "_err",
        from: "bot",
        text: `⚠️ ${err.message}`,
        messageType: "error",
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, user, session]);

  const reset = () => {
    setSession({ intent: null, step: 0, data: {} });
    setMessages([{
      id: "reset_" + Date.now(),
      from: "bot",
      text: `Sure, let's start fresh! What would you like to do?`,
      ts: new Date(),
    }]);
  };

  if (!user) return null;

  return (
    <DashboardLayout hideGlobalChat>
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Chat header bar ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b shadow-sm shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-900">iHR Assistant</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-400">Online · ready to help</span>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            title="Clear chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            onClick={() => {
              const role = user?.role ?? "";
              if (["hr", "manager", "admin"].includes(role)) navigate("/hr/dashboard");
              else if (role === "employee") navigate("/employee/dashboard");
              else if (role === "super_admin") navigate("/admin");
              else navigate("/candidate/dashboard");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            title="Close chat"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>

        {/* ── Messages ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">

          {/* Welcome card (shown above first bot message) */}
          {messages.length <= 1 && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2", msg.from === "user" ? "justify-end" : "justify-start")}>

              {/* Bot avatar */}
              {msg.from === "bot" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1 shadow">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={cn("flex flex-col gap-1.5 max-w-[82%]", msg.from === "user" ? "items-end" : "items-start")}>
                {/* Bubble */}
                <div className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm",
                  msg.from === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm",
                  msg.messageType === "success" && msg.from === "bot" && "bg-emerald-50 border-emerald-200",
                  msg.messageType === "error" && msg.from === "bot" && "bg-red-50 border-red-200",
                )}>
                  {msg.messageType === "success" && msg.from === "bot" && (
                    <CheckCircle2 className="inline w-4 h-4 text-emerald-500 mr-1.5 mb-0.5" />
                  )}
                  {msg.messageType === "error" && msg.from === "bot" && (
                    <AlertCircle className="inline w-4 h-4 text-red-500 mr-1.5 mb-0.5" />
                  )}
                  {msg.from === "user"
                    ? <span className="text-sm leading-relaxed">{msg.text}</span>
                    : <RichText text={msg.text} />
                  }
                </div>

                {/* Cards */}
                {msg.cards && msg.cards.length > 0 && (
                  <div className="w-full space-y-1.5">
                    {msg.cards.slice(0, 8).map((c, i) => <DataCard key={i} card={c} />)}
                    {msg.cards.length > 8 && (
                      <p className="text-xs text-gray-400 pl-1">+{msg.cards.length - 8} more</p>
                    )}
                  </div>
                )}

                {/* Option chips */}
                {msg.options && msg.options.length > 0 && (
                  <div className="flex flex-col gap-1.5 w-full">
                    {msg.options.slice(0, 10).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => sendMessage(opt.value)}
                        className="flex items-center gap-2.5 text-left text-sm px-4 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm group"
                      >
                        <span className="text-base">{opt.icon ?? "👤"}</span>
                        <span className="flex-1 font-medium text-gray-700">{opt.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Navigate link */}
                {msg.navigate && (
                  <button
                    onClick={() => navigate(msg.navigate!)}
                    className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline mt-0.5"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    View in full page
                  </button>
                )}

                {/* Timestamp */}
                <span className="text-xs text-gray-300 px-1">{fmt(msg.ts)}</span>
              </div>

              {/* User avatar placeholder */}
              {msg.from === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1 text-xs font-bold text-primary">
                  {(user.fullName || user.email).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2 items-end">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Suggestion overlay ───────────────────────────────────────── */}
        {showSuggestions && (
          <div className="shrink-0 bg-white border-t shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold text-gray-700">Suggested Questions</p>
              <button onClick={() => setShowSuggestions(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 max-h-64 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { sendMessage(s.text); setShowSuggestions(false); }}
                  className="flex flex-col items-start gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-primary/5 hover:border-primary/30 text-left transition-all"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", s.color)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-medium text-gray-700 leading-snug">{s.text}</p>
                  <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input bar ───────────────────────────────────────────────── */}
        <div className="shrink-0 bg-white border-t px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            {/* Lightning bolt — opens suggestion grid */}
            <button
              onClick={() => setShowSuggestions((v) => !v)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                showSuggestions
                  ? "bg-primary text-white"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              title="Show suggested questions"
            >
              <Zap className="w-4 h-4" />
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={session.intent ? "Type your answer…" : "Ask anything — clock in, check attendance, generate a payslip…"}
                className="w-full bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                disabled={loading}
              />
            </div>

            {/* Send */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
                input.trim() && !loading
                  ? "bg-primary text-white hover:bg-primary/90 shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-300 mt-1.5">
            iHR Assistant can make mistakes. Verify important information before acting.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
