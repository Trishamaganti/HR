import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import {
  Send, Plus, Trash2, Bot, User, Sparkles, Clock, Users,
  FileText, CalendarCheck, RotateCcw, ChevronRight, Loader2,
  MessageSquare, Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type Conversation = {
  id: number;
  title: string;
  createdAt: string;
  messages?: Message[];
};

type ChatAction = {
  type: "punch_in" | "punch_out" | "open_page" | "generate_payslip";
  employeeId?: number;
  location?: string;
  page?: string;
  month?: string;
};

// ── Suggested prompts per role ───────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Users, text: "Who is punched in today?", label: "Attendance" },
  { icon: CalendarCheck, text: "What interviews are scheduled today?", label: "Recruitment" },
  { icon: FileText, text: "Generate a payslip for an employee", label: "Payroll" },
  { icon: Clock, text: "Clock in John Smith at London Office", label: "Clock In" },
  { icon: FileText, text: "Draft an offer letter for a new hire", label: "Offer Letter" },
  { icon: Users, text: "Show me a headcount breakdown by department", label: "Reports" },
  { icon: RotateCcw, text: "Who hasn't punched out yet today?", label: "Attendance" },
  { icon: CalendarCheck, text: "How many employees are on leave this week?", label: "Leave" },
];

// ── Parse actions from assistant message ────────────────────────────────────
function parseActions(content: string): ChatAction[] {
  const actions: ChatAction[] = [];
  const regex = /<action>(.*?)<\/action>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try { actions.push(JSON.parse(match[1])); } catch {}
  }
  return actions;
}

function stripActions(content: string): string {
  return content.replace(/<action>.*?<\/action>/g, "").trim();
}

// ── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onAction }: { msg: Message; onAction: (a: ChatAction) => void }) {
  const isUser = msg.role === "user";
  const actions = isUser ? [] : parseActions(msg.content);
  const clean = isUser ? msg.content : stripActions(msg.content);

  const renderContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("• ") || line.startsWith("- ")) {
        return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold text-sm mt-1">{line.slice(2, -2)}</p>;
      }
      if (line === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex flex-col gap-1.5 max-w-[80%]", isUser && "items-end")}>
        {/* Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border shadow-sm rounded-tl-sm"
        )}>
          <div className={cn("space-y-0.5", isUser ? "text-primary-foreground" : "text-foreground")}>
            {renderContent(clean)}
          </div>
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {actions.map((action, i) => {
              if (action.type === "open_page") {
                return (
                  <Button key={i} size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAction(action)}>
                    <ChevronRight className="h-3 w-3" /> Go to {action.page}
                  </Button>
                );
              }
              if (action.type === "punch_in") {
                return (
                  <Button key={i} size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => onAction(action)}>
                    <Zap className="h-3 w-3" /> Confirm Clock In
                  </Button>
                );
              }
              if (action.type === "punch_out") {
                return (
                  <Button key={i} size="sm" className="h-7 text-xs gap-1 bg-orange-500 hover:bg-orange-600" onClick={() => onAction(action)}>
                    <Zap className="h-3 w-3" /> Confirm Clock Out
                  </Button>
                );
              }
              return null;
            })}
          </div>
        )}

        {msg.createdAt && (
          <span className="text-[10px] text-muted-foreground px-1">
            {format(new Date(msg.createdAt), "HH:mm")}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-card border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AiChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const BASE = getApiUrl();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/openai/conversations`);
      if (r.ok) setConversations(await r.json());
    } finally {
      setLoadingConvs(false);
    }
  }, [BASE]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadConversation = useCallback(async (id: number) => {
    const r = await fetch(`${BASE}/openai/conversations/${id}`);
    if (r.ok) {
      const conv: Conversation = await r.json();
      setMessages(conv.messages ?? []);
      setActiveConvId(id);
    }
  }, [BASE]);

  const newConversation = useCallback(async () => {
    const r = await fetch(`${BASE}/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    });
    if (r.ok) {
      const conv: Conversation = await r.json();
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [BASE]);

  const deleteConversation = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${BASE}/openai/conversations/${id}`, { method: "DELETE" });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  }, [BASE, activeConvId]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    let convId = activeConvId;
    if (!convId) {
      const r = await fetch(`${BASE}/openai/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: content.slice(0, 50) }),
      });
      if (!r.ok) return;
      const conv: Conversation = await r.json();
      convId = conv.id;
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
    }

    setMessages(prev => [...prev, { role: "user", content, createdAt: new Date().toISOString() }]);
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    abortRef.current = new AbortController();

    try {
      const r = await fetch(`${BASE}/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abortRef.current.signal,
      });

      if (!r.ok || !r.body) throw new Error("Stream error");

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const json = JSON.parse(line.slice(5).trim());
            if (json.content) {
              full += json.content;
              setStreamingContent(full);
            }
            if (json.done) {
              setMessages(prev => [...prev, { role: "assistant", content: full, createdAt: new Date().toISOString() }]);
              setStreamingContent("");

              // Update conversation title if first message
              if (messages.length === 0) {
                setConversations(prev => prev.map(c =>
                  c.id === convId ? { ...c, title: content.slice(0, 60) } : c
                ));
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast({ variant: "destructive", title: "Failed to send message" });
        setStreamingContent("");
      }
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }, [input, streaming, activeConvId, BASE, messages.length, toast]);

  const handleAction = useCallback(async (action: ChatAction) => {
    if (action.type === "open_page" && action.page) {
      navigate(action.page);
      return;
    }
    if (action.type === "punch_in" && action.employeeId) {
      const r = await fetch(`${BASE}/attendance/punch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: action.employeeId, type: "punch_in", location: action.location }),
      });
      if (r.ok) {
        toast({ title: "✓ Clocked in successfully" });
        sendMessage("Confirmed — clock in was successful. What else can I help with?");
      }
    }
    if (action.type === "punch_out" && action.employeeId) {
      const r = await fetch(`${BASE}/attendance/punch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: action.employeeId, type: "punch_out" }),
      });
      if (r.ok) {
        toast({ title: "✓ Clocked out successfully" });
        sendMessage("Confirmed — clock out was successful. What else can I help with?");
      }
    }
  }, [BASE, navigate, sendMessage, toast]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const allMessages = streaming && streamingContent
    ? [...messages, { role: "assistant" as const, content: streamingContent }]
    : messages;

  return (
    <DashboardLayout hideGlobalChat>
      <div className="flex flex-1 overflow-hidden gap-4">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-64 flex flex-col border-r bg-muted/20 shrink-0 hidden md:flex">
          <div className="p-3 border-b">
            <Button onClick={newConversation} className="w-full gap-2 h-9 text-sm">
              <Plus className="h-4 w-4" /> New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center p-4">No chats yet</div>
            ) : (
              conversations.map(conv => (
                <button key={conv.id} onClick={() => loadConversation(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 group transition-colors",
                    activeConvId === conv.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                  )}>
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate text-xs">{conv.title}</span>
                  <button onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Main Chat Area ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight">iHR Assistant</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">AI-powered HR operations · Powered by GPT-4o</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {allMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
                {/* Welcome */}
                <div className="text-center space-y-2 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Hello, {user?.fullName?.split(" ")[0] ?? "there"}! 👋</h2>
                  <p className="text-sm text-muted-foreground">
                    I'm your iHR Assistant. Ask me anything about your team, attendance, payroll, or let me help you get things done faster.
                  </p>
                </div>

                {/* Suggestion grid */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
                  {SUGGESTIONS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <button key={i} onClick={() => sendMessage(s.text)}
                        className="flex items-start gap-2.5 p-3 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 text-left transition-all group">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium leading-snug">{s.text}</p>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 mt-1">{s.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {allMessages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} onAction={handleAction} />
                ))}
                {streaming && !streamingContent && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-background p-3 shrink-0">
            {/* Quick suggestions row */}
            {messages.length > 0 && (
              <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                {["Clock in an employee", "Check today's attendance", "Generate payslip", "View rota"].map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="shrink-0 text-[10px] px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything — clock in, check attendance, generate a payslip…"
                  className="pr-10 h-11 rounded-xl text-sm bg-muted/30"
                  disabled={streaming}
                />
              </div>
              <Button onClick={() => sendMessage()} disabled={!input.trim() || streaming}
                className="h-11 w-11 rounded-xl shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 border-0"
                size="icon">
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              iHR Assistant can make mistakes. Verify important information before acting.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
