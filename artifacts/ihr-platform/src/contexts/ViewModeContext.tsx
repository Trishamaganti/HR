import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type ViewMode = "candidate" | "work";

interface ViewModeContextType {
  activeMode: ViewMode;
  switchToWork: () => void;
  switchToCandidate: () => void;
  hasWorkRole: boolean;
  canSwitchToCandidate: boolean;
  workRoleLabel: string;
  workHomePath: string;
  candidateNavItems: NavItem[];
  workNavItems: NavItem[];
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

function getWorkRoleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: "Owner",
    hr: "HR Manager",
    manager: "Manager",
    admin: "Admin",
    employee: "Employee",
    super_admin: "Super Admin",
  };
  return map[role] ?? "Work";
}

function getWorkHomePath(role: string): string {
  if (role === "super_admin") return "/admin";
  if (["owner", "hr", "manager", "admin"].includes(role)) return "/hr/dashboard";
  if (role === "employee") return "/employee/dashboard";
  return "/candidate/dashboard";
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState<ViewMode>("candidate");

  const hasWorkRole = !!user && ["owner", "hr", "manager", "admin", "employee", "super_admin"].includes(user.role);

  // Only manager/owner-level users can switch to a candidate profile view.
  // Regular employees have no separate candidate identity in this system.
  const canSwitchToCandidate = !!user && ["owner", "manager"].includes(user.role);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`ihr_view_mode_${user.id}`);
      if (stored === "candidate" && hasWorkRole) {
        setActiveMode("candidate");
      } else if (hasWorkRole) {
        setActiveMode("work");
      } else {
        setActiveMode("candidate");
      }
    }
  }, [user?.id, user?.role, hasWorkRole]);

  const workRoleLabel = getWorkRoleLabel(user?.role ?? "");
  const workHomePath = getWorkHomePath(user?.role ?? "");

  const switchToWork = () => {
    if (user && hasWorkRole) {
      localStorage.setItem(`ihr_view_mode_${user.id}`, "work");
      setActiveMode("work");
    }
  };

  const switchToCandidate = () => {
    if (user) {
      localStorage.setItem(`ihr_view_mode_${user.id}`, "candidate");
      setActiveMode("candidate");
    }
  };

  const candidateNavItems: NavItem[] = [
    { title: "Dashboard", href: "/candidate/dashboard", icon: "LayoutDashboard" },
    { title: "My Applications", href: "/candidate/applications", icon: "ClipboardList" },
    { title: "Organisations", href: "/candidate/organizations", icon: "Building2" },
    { title: "Data Requests", href: "/candidate/data-requests", icon: "Inbox" },
    { title: "Profile", href: "/candidate/profile", icon: "UserCircle" },
  ];

  const workNavItems: NavItem[] = (() => {
    if (!user) return [];
    const role = user.role;
    if (role === "super_admin") return [
      { title: "Overview", href: "/admin", icon: "LayoutDashboard" },
      { title: "Organisations", href: "/admin/organisations", icon: "Building2" },
      { title: "Companies", href: "/admin/companies", icon: "Building" },
    ];
    if (["owner", "hr", "manager", "admin"].includes(role)) return [
      { title: "Dashboard", href: "/hr/dashboard", icon: "LayoutDashboard" },
      { title: "Jobs", href: "/hr/jobs", icon: "Briefcase" },
      { title: "Recruitment", href: "/hr/recruitment", icon: "FileSearch" },
      { title: "Employees", href: "/hr/employees", icon: "Users" },
      { title: "Attendance", href: "/hr/attendance", icon: "Calendar" },
      { title: "Leaves", href: "/hr/leaves", icon: "FileText" },
      { title: "Payroll", href: "/hr/payroll", icon: "CreditCard" },
      { title: "Rota", href: "/hr/rota", icon: "CalendarRange" },
      { title: "Documents", href: "/hr/documents", icon: "FileBadge" },
      { title: "Doc Templates", href: "/hr/document-templates", icon: "FileCode" },
      { title: "Doc Settings", href: "/hr/document-settings", icon: "Settings2" },
    ];
    if (role === "employee") return [
      { title: "Dashboard", href: "/employee/dashboard", icon: "LayoutDashboard" },
      { title: "My Applications", href: "/candidate/applications", icon: "ClipboardList" },
      { title: "Organisation", href: "/employee/organisation", icon: "Building2" },
      { title: "My Documents", href: "/employee/documents", icon: "FileBadge" },
      { title: "My Profile", href: "/candidate/profile", icon: "UserCircle" },
    ];
    return [];
  })();

  return (
    <ViewModeContext.Provider value={{
      activeMode,
      switchToWork,
      switchToCandidate,
      hasWorkRole,
      canSwitchToCandidate,
      workRoleLabel,
      workHomePath,
      candidateNavItems,
      workNavItems,
    }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return context;
}
