import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Zap, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputBarProps {
  chatPath: string;
  placeholder?: string;
}

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  "/hr": [
    "How many employees are on leave today?",
    "Show me the latest job applications",
    "Who has a pending leave request?",
    "Generate a payslip for an employee",
    "What is the current headcount?",
  ],
  "/hr/employees": [
    "List all active employees",
    "Which employees joined this month?",
    "Show me employees in the HR department",
    "Find employee by name or ID",
    "Who has not submitted their attendance today?",
  ],
  "/hr/recruitment": [
    "How many open positions do we have?",
    "Show candidates in the interview stage",
    "Which job has the most applications?",
    "Schedule an interview for a candidate",
    "What is the average ATS score this month?",
  ],
  "/hr/leaves": [
    "How many leave requests are pending approval?",
    "Show leave balance for all employees",
    "Who is on leave next week?",
    "Approve all pending leave requests",
    "What is the leave policy for casual leaves?",
  ],
  "/hr/attendance": [
    "Who hasn't clocked in today?",
    "Show attendance summary for this week",
    "Which employee has the most absences?",
    "Generate an attendance report for May",
    "Mark attendance for a specific employee",
  ],
  "/hr/payroll": [
    "Generate payslip for this month",
    "What is the total payroll cost this month?",
    "Show salary breakdown for an employee",
    "Are there any payroll discrepancies?",
    "Export payroll report as PDF",
  ],
  "/hr/jobs": [
    "Create a new job posting",
    "Which jobs are currently active?",
    "Close a job that has been filled",
    "How many applications per job opening?",
    "Show jobs posted in the last 30 days",
  ],
  "/candidate": [
    "Check my attendance for this month",
    "Show my payslip for April",
    "Apply for casual leave next week",
    "What is my leave balance?",
    "Show my recent job applications",
  ],
  "/candidate/applications": [
    "What is the status of my latest application?",
    "Which companies have shortlisted me?",
    "How do I improve my application ATS score?",
    "Show all my rejected applications",
    "Withdraw my application from a company",
  ],
  "/candidate/attendance": [
    "Show my attendance this month",
    "How many days was I absent in April?",
    "What time did I clock in today?",
    "Is my attendance below the required threshold?",
    "Show my overtime hours this week",
  ],
  "/candidate/leaves": [
    "How many casual leaves do I have left?",
    "Apply for leave from Monday to Wednesday",
    "Check the status of my leave request",
    "Cancel my pending leave request",
    "What is the maximum sick leave allowed?",
  ],
  "/employee": [
    "Show my payslip for last month",
    "Apply for leave next Friday",
    "What is my current leave balance?",
    "Clock me in for today",
    "Show my attendance summary",
  ],
};

const FALLBACK_SUGGESTIONS = [
  "What can you help me with?",
  "Show me my recent activity",
  "Help me find an employee",
  "Generate a report",
  "Check pending approvals",
];

function getSuggestions(location: string): string[] {
  const exact = PAGE_SUGGESTIONS[location];
  if (exact) return exact;
  const prefix = Object.keys(PAGE_SUGGESTIONS)
    .filter(k => location.startsWith(k) && k !== "/")
    .sort((a, b) => b.length - a.length)[0];
  return PAGE_SUGGESTIONS[prefix ?? ""] ?? FALLBACK_SUGGESTIONS;
}

export function ChatInputBar({ chatPath, placeholder = "Ask anything — clock in, check attendance, generate a payslip…" }: ChatInputBarProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [location, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = getSuggestions(location);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    sessionStorage.setItem("ihr_chat_prefill", msg);
    navigate(chatPath);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Suggestions popup */}
      {showSuggestions && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Suggested questions</span>
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="py-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-2 group"
              >
                <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-primary shrink-0 transition-colors" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-md px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSuggestions(v => !v)}
            title="Show suggested questions"
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
              showSuggestions
                ? "bg-primary text-white shadow-md"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <Zap className="w-4 h-4" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={placeholder}
              className="w-full bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
              input.trim()
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
  );
}
