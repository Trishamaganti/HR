import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatInputBar } from "@/components/ChatInputBar";
import {
  LayoutDashboard, Users, Briefcase, Calendar, FileText,
  CreditCard, Building, Building2, UserCircle, LogOut,
  Menu, FileSearch, ClipboardList, CalendarRange, MessageSquare,
  ChevronRight, ArrowRightLeft, Briefcase as WorkIcon, Inbox, Zap,
  FileBadge, FileCode, Settings2,
} from "lucide-react";

const iconMap: Record<string, ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  Calendar: <Calendar className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  Building: <Building className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  UserCircle: <UserCircle className="w-5 h-5" />,
  FileSearch: <FileSearch className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
  CalendarRange: <CalendarRange className="w-5 h-5" />,
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  Inbox: <Inbox className="w-5 h-5" />,
  FileBadge: <FileBadge className="w-5 h-5" />,
  FileCode: <FileCode className="w-5 h-5" />,
  Settings2: <Settings2 className="w-5 h-5" />,
};

export function DashboardLayout({ children, hideGlobalChat }: { children: ReactNode; hideGlobalChat?: boolean }) {
  const { user, logout } = useAuth();
  const {
    activeMode,
    switchToWork,
    switchToCandidate,
    hasWorkRole,
    canSwitchToCandidate,
    workRoleLabel,
    workHomePath,
    candidateNavItems,
    workNavItems,
  } = useViewMode();
  const [location, setLocation] = useLocation();

  if (!user) return null;

  const navItems = activeMode === "candidate" ? candidateNavItems : workNavItems;
  const aiChatHref = (() => {
    if (activeMode === "candidate") return "/candidate/ai-chat";
    const r = user.role;
    if (["hr", "manager", "admin", "owner"].includes(r)) return "/hr/ai-chat";
    if (r === "employee") return "/employee/ai-chat";
    return "/candidate/ai-chat";
  })();

  const initials = (user.fullName || user.email).charAt(0).toUpperCase();
  const roleLabel: Record<string, string> = {
    hr: "HR Manager", manager: "Manager", admin: "Admin",
    employee: "Employee", candidate: "Candidate", super_admin: "Super Admin",
  };

  const NavLinks = () => (
    <div className="space-y-1 px-2">
      {navItems.map((item) => {
        const isActive =
          location === item.href ||
          (item.href !== aiChatHref && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <div className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors cursor-pointer group ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-gray-700 hover:bg-gray-100"
            }`}>
              <span className={isActive ? "text-primary-foreground" : "text-gray-400 group-hover:text-primary"}>
                {iconMap[item.icon]}
              </span>
              <span className="flex-1">{item.title}</span>
              <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "opacity-100" : ""}`} />
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Gold accent strip at very top */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #683FE0 0%, #D7A364 55%, #E4CA70 100%)" }} />

      {/* Top bar */}
      <header className="flex h-14 items-center justify-between px-4 bg-white border-b shadow-sm sticky top-0 z-40">
        <Link href={aiChatHref} className="flex items-center gap-2 font-bold text-lg tracking-tight text-primary">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow"
            style={{ background: "linear-gradient(135deg, #683FE0 0%, #8B5CF6 100%)" }}>
            <Zap className="w-4 h-4 fill-white text-white" />
          </div>
          <span>iHR</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Mode badge in header — only shown for users who can switch modes */}
          {canSwitchToCandidate && (
            <Badge
              variant="outline"
              className={`text-xs hidden sm:inline-flex ${
                activeMode === "work"
                  ? "border-primary/40 text-primary bg-primary/5"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              {activeMode === "candidate" ? "Candidate Profile" : workRoleLabel}
            </Badge>
          )}

          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              {/* User profile section */}
              <div className="px-5 pt-10 pb-6" style={{ background: "linear-gradient(135deg, #683FE0 0%, #8B5CF6 40%, #D7A364 100%)" }}>
                <Avatar className="h-16 w-16 mb-3 ring-4 ring-white/20">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <p className="text-white font-semibold text-base">{user.fullName || "User"}</p>
                <p className="text-primary-foreground/70 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-block text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {roleLabel[user.role] ?? user.role}
                  </span>
                  {canSwitchToCandidate && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                      activeMode === "candidate"
                        ? "bg-amber-400/30 text-amber-100"
                        : "bg-green-400/30 text-green-100"
                    }`}>
                      {activeMode === "candidate" ? "Candidate Mode" : "Work Mode"}
                    </span>
                  )}
                </div>
              </div>

              {/* Mode switcher — only for elevated roles (owner/hr/manager/admin) who have a candidate profile */}
              {canSwitchToCandidate && (
                <div className="px-3 pt-4 pb-2">
                  {activeMode === "candidate" ? (
                    <button
                      onClick={() => {
                        switchToWork();
                        setLocation(workHomePath);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold bg-primary/8 border border-primary/20 text-primary hover:bg-primary/15 transition-colors"
                    >
                      <WorkIcon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">Switch to {workRoleLabel}</span>
                      <ArrowRightLeft className="w-4 h-4 opacity-60" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        switchToCandidate();
                        setLocation("/candidate");
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <UserCircle className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">Switch to Candidate Profile</span>
                      <ArrowRightLeft className="w-4 h-4 opacity-60" />
                    </button>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="mx-3 border-t" />

              {/* Nav links */}
              <ScrollArea className="flex-1 py-3">
                <p className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {activeMode === "candidate" ? "Candidate Profile" : workRoleLabel}
                </p>
                <NavLinks />
              </ScrollArea>

              {/* Logout */}
              <div className="border-t p-4">
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Log out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Page content */}
      {hideGlobalChat ? (
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-48">
            {children}
          </div>
        </main>
      )}

      {/* Fixed chat bar */}
      {!hideGlobalChat && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold tracking-wide">ASK THE iHR ASSISTANT</p>
            <ChatInputBar
              chatPath={aiChatHref}
              placeholder={activeMode === "candidate"
                ? "Ask anything — check my attendance, show my payslip, apply for leave…"
                : "Ask anything — who is on leave, generate payslip, schedule interview…"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
