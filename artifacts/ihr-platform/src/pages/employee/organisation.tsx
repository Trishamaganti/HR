import { useState } from "react";
import { useLocation } from "wouter";
import { format, startOfWeek, addDays } from "date-fns";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import {
  useListEmployees, useGetCompany, useListApplications,
  useListAttendance, useListLeaves, usePunchAttendance, useCreateLeave,
  getListApplicationsQueryKey, getListAttendanceQueryKey, getListLeavesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Building2, Users, Briefcase, Globe, CheckCircle2, Mail, Hash,
  ArrowRightLeft, Lock, Clock, CalendarDays, BarChart3, FolderOpen,
  ClipboardList, LogIn, LogOut, Loader2, Plus, FileText, Download,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Constants ──────────────────────────────────────────────────────────────

const DEMO_PAYSLIPS = [
  { period: "April 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
  { period: "March 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
  { period: "February 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
  { period: "January 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
];

const DEMO_TAX_DOCS = [
  { name: "P60 – End of Year Certificate 2025–26", type: "P60", date: "May 2026" },
  { name: "P45 – Previous Employment 2024–25", type: "P45", date: "Apr 2025" },
  { name: "Form 16 / Annual Tax Statement 2024–25", type: "Form 16", date: "Jun 2025" },
];

const CERT_TYPES = [
  "Experience Letter", "Conduct Certificate", "Relieving Letter",
  "Annual Tax Certificate", "Employment Verification Letter", "Salary Certificate",
  "Offer Letter", "Promotion Letter", "Leave Records", "Payslip Bundle",
  "Final Settlement Documents",
];

const DEMO_CERT_REQUESTS = [
  { type: "Experience Letter", date: "2026-05-10", status: "Completed" },
  { type: "Salary Certificate", date: "2026-04-22", status: "Pending" },
];

const roleLabel: Record<string, string> = {
  employee: "Employee", manager: "Manager", hr: "HR Manager",
  admin: "Admin", owner: "Owner", super_admin: "Super Admin", candidate: "Candidate",
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700",
];
const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

type OrgEntry = {
  companyId: number;
  companyName: string;
  jobTitle?: string;
  status: "current" | "past";
  appliedAt?: string;
};

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeOrganisation() {
  const { user } = useAuth();
  const { switchToWork, workHomePath } = useViewMode();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string>("");
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [certType, setCertType] = useState("");
  const [certNote, setCertNote] = useState("");
  const [certSubmitting, setCertSubmitting] = useState(false);
  const [certRequests, setCertRequests] = useState(DEMO_CERT_REQUESTS);

  const canManage = !!user && ["owner", "manager", "hr", "admin"].includes(user.role);

  // ── Org list ──
  const appParams = { candidateId: user?.id ?? undefined };
  const { data: applications } = useListApplications(appParams, {
    query: { enabled: !!user?.id, queryKey: getListApplicationsQueryKey(appParams) },
  });

  const orgs: OrgEntry[] = [];
  const seen = new Set<number>();
  if (user?.companyId) {
    seen.add(user.companyId);
    orgs.push({ companyId: user.companyId, companyName: "Current Employer", status: "current" });
  }
  applications?.forEach((app) => {
    const cId = (app as any).companyId as number | undefined;
    if (cId && !seen.has(cId)) {
      seen.add(cId);
      orgs.push({
        companyId: cId,
        companyName: (app as any).companyName ?? `Company #${cId}`,
        jobTitle: app.jobTitle ?? undefined,
        status: "past",
        appliedAt: app.appliedAt ?? undefined,
      });
    }
  });

  const effectiveId = selectedId || String(orgs[0]?.companyId ?? "");
  const selectedOrg = orgs.find((o) => String(o.companyId) === effectiveId) ?? orgs[0];
  const isCurrentOrg = selectedOrg?.status === "current";

  // ── Data fetching for selected org ──
  const { data: company, isLoading: companyLoading } = useGetCompany(
    selectedOrg?.companyId ?? 0,
    { query: { enabled: !!selectedOrg?.companyId } }
  );

  const empParams = { companyId: selectedOrg?.companyId ?? undefined };
  const { data: employees, isLoading: empLoading } = useListEmployees(empParams, {
    query: { enabled: isCurrentOrg && !!selectedOrg?.companyId, queryKey: ["employees", selectedOrg?.companyId] },
  });

  // Numeric employee ID from the employee record
  const myEmployeeRecord = employees?.find((e) => e.email === user?.email);
  const empId = myEmployeeRecord?.id ?? null;
  const teammates = employees?.filter((e) => e.email !== user?.email) ?? [];

  const attParams = { employeeId: empId ?? undefined };
  const { data: attendance } = useListAttendance(attParams, {
    query: { enabled: isCurrentOrg && !!empId, queryKey: getListAttendanceQueryKey(attParams) },
  });

  const leaveParams = { employeeId: empId ?? undefined };
  const { data: leaves } = useListLeaves(leaveParams, {
    query: { enabled: isCurrentOrg && !!empId, queryKey: getListLeavesQueryKey(leaveParams) },
  });

  const punchMutation = usePunchAttendance();
  const createLeaveMutation = useCreateLeave();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRecord = attendance?.find((a) => a.date.startsWith(todayStr));
  const hasPunchedIn = !!todayRecord?.punchIn;
  const hasPunchedOut = !!todayRecord?.punchOut;
  const leaveBalance = myEmployeeRecord?.leaveBalance ?? 20;
  const usedLeave = leaves?.filter((l) => l.status === "approved").reduce((s, l) => s + (l.days ?? 0), 0) ?? 0;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isLoading = companyLoading || (isCurrentOrg && empLoading);

  // ── Handlers ──
  const handleSwitch = () => { if (canManage) { switchToWork(); setLocation(workHomePath); } };

  const handlePunch = (type: "punch_in" | "punch_out") => {
    if (!empId) return;
    setIsPunching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => doPunch(type, `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
      () => doPunch(type, "Location unavailable"),
      { timeout: 6000 }
    );
  };

  const doPunch = (type: "punch_in" | "punch_out", location: string) => {
    punchMutation.mutate({ data: { employeeId: empId!, type, location } }, {
      onSuccess: () => {
        toast({ title: `Punched ${type === "punch_in" ? "In" : "Out"} ✓`, description: `Recorded at ${format(new Date(), "HH:mm:ss")}` });
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey(attParams) });
      },
      onError: () => toast({ variant: "destructive", title: "Punch Failed" }),
      onSettled: () => setIsPunching(false),
    });
  };

  const handleApplyLeave = () => {
    if (!empId || !leaveForm.startDate || !leaveForm.endDate) return;
    setIsApplyingLeave(true);
    createLeaveMutation.mutate({
      data: { employeeId: empId, leaveType: leaveForm.leaveType as any, startDate: leaveForm.startDate, endDate: leaveForm.endDate, reason: leaveForm.reason || null } as any,
    }, {
      onSuccess: () => {
        toast({ title: "Leave applied successfully" });
        queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey(leaveParams) });
        setLeaveDialog(false);
        setLeaveForm({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to apply leave" }),
      onSettled: () => setIsApplyingLeave(false),
    });
  };

  const handleCertRequest = () => {
    if (!certType) return;
    setCertSubmitting(true);
    setTimeout(() => {
      setCertRequests((prev) => [{ type: certType, date: format(new Date(), "yyyy-MM-dd"), status: "Pending" }, ...prev]);
      setCertType(""); setCertNote(""); setCertSubmitting(false);
      toast({ title: "Certificate requested", description: `Your request for "${certType}" has been sent to HR.` });
    }, 800);
  };

  // ── Render ──
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Organisation</h1>
          <p className="text-muted-foreground">Your company, your role, and your team.</p>
        </div>

        {/* Org selector — always visible */}
        {orgs.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Select Organisation</label>
            <Select value={effectiveId} onValueChange={(v) => { setSelectedId(v); }}>
              <SelectTrigger className="w-full h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => {
                  const displayName = org.status === "current" && company?.name ? company.name : org.companyName;
                  return (
                    <SelectItem key={org.companyId} value={String(org.companyId)} className="py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          org.status === "current" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                        }`}>
                          {displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {displayName}
                            {org.status === "current" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {org.status === "current" ? "Current Employer" : `Past · ${org.jobTitle ?? "Employee"}`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* ── Company card ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                    {(company?.name ?? selectedOrg?.companyName ?? "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">
                        {company?.name ?? selectedOrg?.companyName ?? "Your Company"}
                      </CardTitle>
                      <Badge variant="default" className={isCurrentOrg
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {isCurrentOrg ? <><CheckCircle2 className="h-3 w-3 mr-1" />Active</> : "Past"}
                      </Badge>
                    </div>
                    {company?.industry && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />{company.industry}
                      </p>
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          variant={canManage ? "default" : "outline"}
                          disabled={!canManage}
                          onClick={handleSwitch}
                          className={`gap-1.5 shrink-0 ${!canManage ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {canManage ? <ArrowRightLeft className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          Switch to Manage
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canManage && (
                      <TooltipContent side="left" className="max-w-56">
                        Requires Manager or Owner access. Contact your Org Admin to grant management access.
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {company?.companySize && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1"><Users className="h-3 w-3" /> Size</span>
                      <span className="text-sm font-semibold">{company.companySize} employees</span>
                    </div>
                  )}
                  {company?.website && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1"><Globe className="h-3 w-3" /> Website</span>
                      <a href={company.website} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary hover:underline truncate">
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                  {company?.plan && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Plan</span>
                      <span className="text-sm font-semibold capitalize">{company.plan}</span>
                    </div>
                  )}
                  {isCurrentOrg && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1"><Users className="h-3 w-3" /> Team</span>
                      <span className="text-sm font-semibold">{employees?.length ?? 0} members</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── My Role card ── */}
            <Card className="border-primary/30 bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  My Role
                  {!isCurrentOrg && <Badge variant="secondary" className="text-xs ml-1">Past Employment</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Name</span>
                    <span className="text-sm font-semibold">{user?.fullName ?? "—"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Role</span>
                    <Badge variant="outline" className="w-fit text-xs border-primary/40 text-primary">
                      {isCurrentOrg ? (roleLabel[user?.role ?? ""] ?? user?.role) : (selectedOrg?.jobTitle ?? "Employee")}
                    </Badge>
                  </div>
                  {myEmployeeRecord?.designation && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Title</span>
                      <span className="text-sm font-semibold">{myEmployeeRecord.designation}</span>
                    </div>
                  )}
                  {myEmployeeRecord?.department && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Department</span>
                      <span className="text-sm font-semibold">{myEmployeeRecord.department}</span>
                    </div>
                  )}
                  {isCurrentOrg && user?.employeeId && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1"><Hash className="h-3 w-3" /> Employee ID</span>
                      <span className="text-sm font-semibold font-mono">{user.employeeId}</span>
                    </div>
                  )}
                  {myEmployeeRecord?.joiningDate && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Joined</span>
                      <span className="text-sm font-semibold">
                        {new Date(myEmployeeRecord.joiningDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Org-specific tabs ── */}
            <Card>
              <CardContent className="pt-4">
                <Tabs defaultValue="attendance">
                  <TabsList className="flex w-full mb-4 gap-0.5 h-auto flex-wrap">
                    <TabsTrigger value="attendance" className="flex-1 text-xs gap-1 py-2"><Clock className="h-3 w-3" />Attendance</TabsTrigger>
                    <TabsTrigger value="leave" className="flex-1 text-xs gap-1 py-2"><CalendarDays className="h-3 w-3" />Leave</TabsTrigger>
                    <TabsTrigger value="rota" className="flex-1 text-xs gap-1 py-2"><BarChart3 className="h-3 w-3" />Rota</TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 text-xs gap-1 py-2"><FolderOpen className="h-3 w-3" />Documents</TabsTrigger>
                    <TabsTrigger value="summary" className="flex-1 text-xs gap-1 py-2"><ClipboardList className="h-3 w-3" />Summary</TabsTrigger>
                  </TabsList>

                  {/* ── Attendance ── */}
                  <TabsContent value="attendance" className="space-y-4">
                    {!isCurrentOrg && (
                      <div className="text-xs text-muted-foreground bg-muted/30 border rounded-lg p-3">
                        📁 This was a past employment — attendance records are read-only.
                      </div>
                    )}
                    {isCurrentOrg && (
                      <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                        <p className="text-sm font-medium">Today — {format(new Date(), "EEEE, dd MMM yyyy")}</p>
                        <div className="flex gap-3">
                          <Button size="sm" className="flex-1" disabled={isPunching || hasPunchedIn || !empId} onClick={() => handlePunch("punch_in")}>
                            {isPunching && !hasPunchedIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                            {hasPunchedIn ? `Punched In ${todayRecord?.punchIn ? format(new Date(todayRecord.punchIn), 'HH:mm') : null}` : "Punch In"}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" disabled={isPunching || !hasPunchedIn || hasPunchedOut || !empId} onClick={() => handlePunch("punch_out")}>
                            {isPunching && hasPunchedIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                            {hasPunchedOut ? `Punched Out ${todayRecord?.punchOut ? format(new Date(todayRecord.punchOut), 'HH:mm') : null}` : "Punch Out"}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Recent History</p>
                      <div className="space-y-1.5">
                        {(attendance ?? []).slice(-7).reverse().length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">No attendance records yet</p>
                        ) : (attendance ?? []).slice(-7).reverse().map((r) => (
                          <div key={r.id} className="flex items-center gap-2 text-xs p-2 bg-background rounded border">
                            <span className="w-28 font-medium shrink-0">{r.date}</span>
                            <span className="text-muted-foreground">In: {r.punchIn ? format(new Date(r.punchIn), 'HH:mm') : '—'}</span>
                            <span className="text-muted-foreground ml-2">Out: {r.punchOut ? format(new Date(r.punchOut), 'HH:mm') : '—'}</span>
                            <Badge variant={r.status === "present" ? "default" : r.status === "absent" ? "destructive" : "secondary"} className="ml-auto text-[10px] capitalize">
                              {r.status.replace("_", " ")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Leave ── */}
                  <TabsContent value="leave" className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-background border rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-primary">{leaveBalance}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Leave Balance</div>
                      </div>
                      <div className="bg-background border rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{usedLeave}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Used</div>
                      </div>
                      <div className="bg-background border rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-amber-500">{leaves?.filter((l) => l.status === "pending").length ?? 0}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Pending</div>
                      </div>
                    </div>
                    {isCurrentOrg && (
                      <Button size="sm" className="w-full" disabled={!empId} onClick={() => setLeaveDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Apply Leave
                      </Button>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Leave Requests</p>
                      <div className="space-y-1.5">
                        {!leaves || leaves.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">No leave requests yet</p>
                        ) : leaves.slice(0, 6).map((l) => (
                          <div key={l.id} className="flex items-center gap-3 text-xs p-2 bg-background rounded border">
                            <div className="flex-1">
                              <span className="font-medium capitalize">{l.leaveType} Leave</span>
                              <span className="text-muted-foreground ml-2">{l.startDate} → {l.endDate} ({l.days}d)</span>
                            </div>
                            <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                              {l.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Rota ── */}
                  <TabsContent value="rota">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">
                      Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
                    </p>
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day, i) => {
                        const dayStr = format(day, "yyyy-MM-dd");
                        const rec = attendance?.find((a) => a.date.startsWith(dayStr));
                        const isToday = dayStr === todayStr;
                        return (
                          <div key={i} className={`flex flex-col items-center p-2 rounded-lg border text-center ${isToday ? "border-primary bg-primary/5" : "bg-background"}`}>
                            <span className="text-[10px] font-medium text-muted-foreground">{format(day, "EEE")}</span>
                            <span className={`text-sm font-bold mt-0.5 ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</span>
                            <div className="mt-1.5">
                              {rec ? (
                                <Badge variant={rec.status === "present" ? "default" : rec.status === "absent" ? "destructive" : "secondary"} className="text-[8px] px-1 py-0">
                                  {rec.status === "present" ? "✓" : rec.status === "half_day" ? "½" : "✗"}
                                </Badge>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">{i >= 5 ? "OFF" : "—"}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg border">
                      <p className="text-xs font-semibold mb-2">Shift Schedule</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { shift: "Morning", time: "06:00 – 14:00", color: "bg-blue-100 text-blue-700" },
                          { shift: "General", time: "09:00 – 18:00", color: "bg-green-100 text-green-700" },
                          { shift: "Evening", time: "14:00 – 22:00", color: "bg-orange-100 text-orange-700" },
                          { shift: "Night", time: "22:00 – 06:00", color: "bg-indigo-100 text-indigo-700" },
                        ].map((s, i) => (
                          <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded ${s.color}`}>
                            <span className="font-medium">{s.shift}</span>
                            <span className="text-[10px]">{s.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Documents ── */}
                  <TabsContent value="documents" className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payslips</p>
                      <div className="space-y-1.5">
                        {DEMO_PAYSLIPS.map((p, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs p-2.5 bg-background rounded-lg border">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium">{p.period}</span>
                              <span className="text-muted-foreground ml-3">Gross: {p.gross} · Net: {p.net}</span>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1">
                              <Download className="h-3 w-3" /> Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tax Documents</p>
                      <div className="space-y-1.5">
                        {DEMO_TAX_DOCS.map((d, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs p-2.5 bg-background rounded-lg border">
                            <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium">{d.name}</span>
                              <span className="text-muted-foreground ml-2">· {d.date}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">{d.type}</Badge>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1">
                              <Download className="h-3 w-3" /> Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Summary ── */}
                  <TabsContent value="summary" className="space-y-4">
                    <div className="border rounded-lg p-4 bg-muted/10 space-y-3">
                      <p className="text-sm font-semibold">Request a Certificate / Letter</p>
                      <div>
                        <Label className="text-xs mb-1 block">Document Type</Label>
                        <Select value={certType} onValueChange={setCertType}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select document to request..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CERT_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Note / Reason (optional)</Label>
                        <Textarea placeholder="e.g. Required for visa application..." className="text-xs resize-none min-h-[60px]" value={certNote} onChange={(e) => setCertNote(e.target.value)} />
                      </div>
                      <Button size="sm" className="w-full gap-1.5" disabled={!certType || certSubmitting} onClick={handleCertRequest}>
                        {certSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send Request to HR
                      </Button>
                    </div>
                    {certRequests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Previous Requests</p>
                        <div className="space-y-1.5">
                          {certRequests.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs p-2.5 bg-background rounded-lg border">
                              <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium">{r.type}</span>
                                <span className="text-muted-foreground ml-2">· {r.date}</span>
                              </div>
                              <Badge variant={r.status === "Completed" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* ── Team Members (current org only) ── */}
            {isCurrentOrg ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Team Members
                    <Badge variant="secondary" className="ml-1 text-xs">{teammates.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teammates.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-muted-foreground">
                      <Users className="h-12 w-12 opacity-20 mb-3" />
                      <p className="text-sm">No other team members found.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {teammates.map((emp, idx) => (
                        <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl border bg-background hover:bg-muted/40 transition-colors">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className={`text-sm font-bold ${avatarColor(idx)}`}>
                              {getInitials(emp.fullName ?? emp.email ?? "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{emp.fullName ?? "—"}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              {emp.designation ?? "Employee"}
                              {emp.department && <span className="text-muted-foreground/60"> · {emp.department}</span>}
                            </p>
                          </div>
                          {emp.email && (
                            <a href={`mailto:${emp.email}`} className="shrink-0 text-muted-foreground hover:text-primary transition-colors" title={emp.email}>
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
                  <Building2 className="h-10 w-10 opacity-20 mb-3" />
                  <p className="text-sm font-medium">Team data not available</p>
                  <p className="text-xs mt-1">Team member records are only available for your current employer.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Apply Leave Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Leave Type</Label>
              <Select value={leaveForm.leaveType} onValueChange={(v) => setLeaveForm((f) => ({ ...f, leaveType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[{ value: "casual", label: "Casual Leave" }, { value: "sick", label: "Sick Leave" }, { value: "earned", label: "Earned / Annual Leave" }, { value: "maternity", label: "Maternity Leave" }, { value: "paternity", label: "Paternity Leave" }].map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Start Date</Label><Input type="date" className="mt-1" value={leaveForm.startDate} onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div><Label className="text-xs">End Date</Label><Input type="date" className="mt-1" value={leaveForm.endDate} onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea className="mt-1 resize-none min-h-[80px] text-sm" placeholder="Reason for leave..." value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setLeaveDialog(false)}>Cancel</Button>
              <Button className="flex-1" disabled={isApplyingLeave || !leaveForm.startDate || !leaveForm.endDate} onClick={handleApplyLeave}>
                {isApplyingLeave && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
