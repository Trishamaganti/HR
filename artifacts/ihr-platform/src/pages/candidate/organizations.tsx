import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useLocation } from "wouter";
import {
  useListApplications, useListAttendance, useListLeaves,
  getListAttendanceQueryKey, getListLeavesQueryKey,
  getListApplicationsQueryKey, useListEmployees, usePunchAttendance, useCreateLeave,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Briefcase, Calendar, CheckCircle2, Clock, LogIn, LogOut, Loader2,
  Plus, CalendarDays, BarChart3, ClipboardList, FileText, Download, Send, FolderOpen,
  ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const DEMO_PAYSLIPS = [
  { period: "April 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
  { period: "March 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
  { period: "February 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
  { period: "January 2026", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
  { period: "December 2025", gross: "£3,400", net: "£2,620", tax: "£560", ni: "£220" },
  { period: "November 2025", gross: "£3,200", net: "£2,480", tax: "£520", ni: "£200" },
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

type OrgEntry = {
  companyId: number;
  companyName: string;
  jobTitle?: string;
  status: string;
  appliedAt?: string;
  isCurrentEmployer: boolean;
};

const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "hired" || s === "employed") return "default";
  if (s === "rejected" || s === "resigned") return "destructive";
  if (s === "demo") return "outline";
  return "secondary";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    employed: "Currently Employed",
    demo: "Preview Mode",
    hired: "Hired",
    rejected: "Rejected",
    resigned: "Resigned",
    applied: "Applied",
    shortlisted: "Shortlisted",
    interview: "Interview",
    conditional_offer: "Conditional Offer",
    verification: "Verification",
    final_offer: "Final Offer",
  };
  return map[s] ?? s.replace(/_/g, " ");
};

const statusEmoji = (s: string) => {
  if (s === "employed" || s === "hired" || s === "demo") return "🟢";
  if (s === "resigned" || s === "rejected") return "🔴";
  return "🟡";
};

export default function CandidateOrganizations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { hasWorkRole, switchToWork, workRoleLabel, workHomePath } = useViewMode();
  const [, setLocation] = useLocation();

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [isPunching, setIsPunching] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [certType, setCertType] = useState("");
  const [certNote, setCertNote] = useState("");
  const [certSubmitting, setCertSubmitting] = useState(false);
  const [certRequests, setCertRequests] = useState(DEMO_CERT_REQUESTS);

  const appParams = { candidateId: user?.id ?? undefined };
  const { data: applications, isLoading: appsLoading } = useListApplications(
    appParams,
    { query: { enabled: !!user?.id, queryKey: getListApplicationsQueryKey(appParams) } }
  );

  const empId = user?.employeeId ? parseInt(user.employeeId as string, 10) : null;
  const attParams = { employeeId: empId ?? undefined };
  const { data: attendance } = useListAttendance(attParams, { query: { enabled: !!empId, queryKey: getListAttendanceQueryKey(attParams) } });
  const leaveParams = { employeeId: empId ?? undefined };
  const { data: leaves } = useListLeaves(leaveParams, { query: { enabled: !!empId, queryKey: getListLeavesQueryKey(leaveParams) } });
  const empParams = { companyId: user?.companyId ?? undefined };
  const { data: employees } = useListEmployees(empParams, { query: { enabled: !!user?.companyId, queryKey: ["employees", user?.companyId] } });

  const punchMutation = usePunchAttendance();
  const createLeaveMutation = useCreateLeave();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRecord = attendance?.find(a => a.date.startsWith(todayStr));
  const hasPunchedIn = !!todayRecord?.punchIn;
  const hasPunchedOut = !!todayRecord?.punchOut;
  const myEmployee = employees?.find(e => e.email === user?.email);

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
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ employeeId: empId! }) });
      },
      onError: () => toast({ variant: "destructive", title: "Punch Failed" }),
      onSettled: () => setIsPunching(false),
    });
  };

  const handleApplyLeave = () => {
    if (!empId || !leaveForm.startDate || !leaveForm.endDate) return;
    setIsApplyingLeave(true);
    createLeaveMutation.mutate({
      data: {
        employeeId: empId,
        leaveType: leaveForm.leaveType as any,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || null,
      } as any
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
      setCertRequests(prev => [{ type: certType, date: format(new Date(), "yyyy-MM-dd"), status: "Pending" }, ...prev]);
      setCertType(""); setCertNote(""); setCertSubmitting(false);
      toast({ title: "Certificate requested", description: `Your request for "${certType}" has been sent to HR.` });
    }, 800);
  };

  // Build orgs list
  const orgs: OrgEntry[] = [];
  const seenCompanies = new Set<number>();

  if (user?.companyId && !seenCompanies.has(user.companyId)) {
    seenCompanies.add(user.companyId);
    orgs.push({
      companyId: user.companyId,
      companyName: myEmployee?.email?.split("@")[1]?.split(".")[0]
        ? (myEmployee.email.split("@")[1].charAt(0).toUpperCase() + myEmployee.email.split("@")[1].slice(1).split(".")[0])
        : "Current Employer",
      jobTitle: myEmployee?.designation || undefined,
      status: "employed",
      isCurrentEmployer: true,
    });
  }

  applications?.forEach(app => {
    const cId = (app as any).companyId;
    if (cId && !seenCompanies.has(cId)) {
      seenCompanies.add(cId);
      orgs.push({
        companyId: cId,
        companyName: (app as any).companyName ?? `Company #${cId}`,
        jobTitle: app.jobTitle ?? undefined,
        status: app.status,
        appliedAt: app.appliedAt,
        isCurrentEmployer: cId === user?.companyId,
      });
    }
  });

  const DEMO_ORG: OrgEntry = { companyId: -1, companyName: "TxSprint Technologies", jobTitle: "Software Engineer", status: "demo", isCurrentEmployer: true };
  const DEMO_ORG_PAST: OrgEntry = { companyId: -2, companyName: "CloudStack Solutions", jobTitle: "Junior Developer", status: "resigned", appliedAt: "2024-01-15", isCurrentEmployer: false };
  const DEMO_ORG_PAST2: OrgEntry = { companyId: -3, companyName: "DataTech Systems", jobTitle: "Frontend Developer", status: "resigned", appliedAt: "2022-06-01", isCurrentEmployer: false };

  const isDemo = !empId;
  const displayOrgs: OrgEntry[] = orgs.length > 0 ? orgs : isDemo ? [DEMO_ORG, DEMO_ORG_PAST, DEMO_ORG_PAST2] : [];

  // Default to first org
  const effectiveSelectedId = selectedOrgId || String(displayOrgs[0]?.companyId ?? "");
  const selectedOrg = displayOrgs.find(o => String(o.companyId) === effectiveSelectedId) ?? displayOrgs[0];
  const isSelectedCurrentEmployer = selectedOrg?.isCurrentEmployer ?? false;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const recentAttendance = (attendance ?? []).slice(-7).reverse();
  const leaveBalance = myEmployee?.leaveBalance ?? 20;
  const usedLeave = leaves?.filter(l => l.status === "approved").reduce((sum, l) => sum + (l.days ?? 0), 0) ?? 0;

  const DemoBanner = ({ text }: { text: string }) => (
    <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3 mb-1">
      📋 {text}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Organisations</h1>
          <p className="text-muted-foreground">Select an organisation to view attendance, leave, documents and more.</p>
        </div>

        {appsLoading ? (
          <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : displayOrgs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
              <Building2 className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-lg font-medium">No organisations yet</p>
              <p className="text-sm mt-1">Apply for jobs to start building your employment history.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Organisation Dropdown Selector ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Select Organisation</label>
              <Select value={effectiveSelectedId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-full h-14 text-left">
                  <SelectValue>
                    {selectedOrg && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                          {selectedOrg.companyName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            {selectedOrg.companyName}
                            {selectedOrg.isCurrentEmployer && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {selectedOrg.jobTitle && <span>{selectedOrg.jobTitle}</span>}
                            <span className={`inline-flex items-center gap-1 font-medium ${
                              statusColor(selectedOrg.status) === "default" ? "text-green-600" :
                              statusColor(selectedOrg.status) === "destructive" ? "text-red-500" : "text-amber-600"
                            }`}>
                              {statusEmoji(selectedOrg.status)} {statusLabel(selectedOrg.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Group: Current */}
                  {displayOrgs.filter(o => o.isCurrentEmployer || o.status === "employed" || o.status === "demo" || o.status === "hired").length > 0 && (
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Current Employment
                    </div>
                  )}
                  {displayOrgs
                    .filter(o => o.isCurrentEmployer || o.status === "employed" || o.status === "demo" || o.status === "hired")
                    .map(org => (
                      <SelectItem key={org.companyId} value={String(org.companyId)} className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">
                            {org.companyName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-sm">
                              {org.companyName}
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {org.jobTitle && <span>{org.jobTitle}</span>}
                              <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 hover:bg-green-100">
                                🟢 {statusLabel(org.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}

                  {/* Group: Past */}
                  {displayOrgs.filter(o => !o.isCurrentEmployer && o.status !== "employed" && o.status !== "demo" && o.status !== "hired").length > 0 && (
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t mt-1">
                      Past Employment
                    </div>
                  )}
                  {displayOrgs
                    .filter(o => !o.isCurrentEmployer && o.status !== "employed" && o.status !== "demo" && o.status !== "hired")
                    .map(org => (
                      <SelectItem key={org.companyId} value={String(org.companyId)} className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold shrink-0">
                            {org.companyName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{org.companyName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {org.jobTitle && <span>{org.jobTitle}</span>}
                              {org.appliedAt && <span>· Since {format(new Date(org.appliedAt), "MMM yyyy")}</span>}
                              <Badge variant={statusColor(org.status)} className="text-[10px] h-4 px-1.5">
                                {statusEmoji(org.status)} {statusLabel(org.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Selected Org Detail Card ── */}
            {selectedOrg && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {selectedOrg.companyName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedOrg.companyName}
                        {isSelectedCurrentEmployer && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </CardTitle>
                      {selectedOrg.jobTitle && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Briefcase className="h-3.5 w-3.5" /> {selectedOrg.jobTitle}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={statusColor(selectedOrg.status)} className="capitalize">
                        {statusEmoji(selectedOrg.status)} {statusLabel(selectedOrg.status)}
                      </Badge>
                      {isSelectedCurrentEmployer && hasWorkRole && (
                        <button
                          onClick={() => { switchToWork(); setLocation(workHomePath); }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors"
                        >
                          <Building2 className="h-3 w-3" />
                          Manage as {workRoleLabel}
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedOrg.appliedAt && !isSelectedCurrentEmployer && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      Since {format(new Date(selectedOrg.appliedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
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
                      {isDemo && <DemoBanner text="Demo preview — once your employment is set up, you'll punch in/out here using GPS location." />}
                      {isSelectedCurrentEmployer ? (
                        <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                          <p className="text-sm font-medium">Today — {format(new Date(), "EEEE, dd MMM yyyy")}</p>
                          <div className="flex gap-3">
                            <Button size="sm" className="flex-1" disabled={isPunching || hasPunchedIn || isDemo} onClick={() => handlePunch("punch_in")}>
                              {isPunching && !hasPunchedIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                              {hasPunchedIn ? `Punched In ${todayRecord?.punchIn?.slice(0, 5)}` : "Punch In"}
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" disabled={isPunching || !hasPunchedIn || hasPunchedOut || isDemo} onClick={() => handlePunch("punch_out")}>
                              {isPunching && hasPunchedIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                              {hasPunchedOut ? `Punched Out ${todayRecord?.punchOut?.slice(0, 5)}` : "Punch Out"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground bg-muted/30 border rounded-lg p-3">
                          📁 This was a past employment — attendance records are read-only.
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Recent History</p>
                        {isDemo ? (
                          <div className="space-y-1.5">
                            {[
                              { date: "Mon 19 May", in: "09:02", out: "18:05", status: "present" },
                              { date: "Tue 20 May", in: "09:15", out: "17:55", status: "present" },
                              { date: "Wed 21 May", in: "—", out: "—", status: "absent" },
                              { date: "Thu 22 May", in: "09:30", out: "13:00", status: "half_day" },
                              { date: "Fri 23 May", in: "09:00", out: "18:00", status: "present" },
                            ].map((r, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs p-2 bg-background rounded border">
                                <span className="w-24 font-medium">{r.date}</span>
                                <span className="text-muted-foreground">In: {r.in}</span>
                                <span className="text-muted-foreground">Out: {r.out}</span>
                                <Badge variant={r.status === "present" ? "default" : r.status === "absent" ? "destructive" : "secondary"} className="ml-auto text-[10px] capitalize">{r.status.replace("_", " ")}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {recentAttendance.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-4 text-center">No attendance records yet</p>
                            ) : recentAttendance.map(r => (
                              <div key={r.id} className="flex items-center gap-2 text-xs p-2 bg-background rounded border">
                                <span className="w-24 font-medium">{r.date}</span>
                                <span className="text-muted-foreground">In: {r.punchIn?.slice(0, 5) ?? "—"}</span>
                                <span className="text-muted-foreground">Out: {r.punchOut?.slice(0, 5) ?? "—"}</span>
                                <Badge variant={r.status === "present" ? "default" : r.status === "absent" ? "destructive" : "secondary"} className="ml-auto text-[10px] capitalize">{r.status.replace("_", " ")}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* ── Leave ── */}
                    <TabsContent value="leave" className="space-y-4">
                      {isDemo && <DemoBanner text="Demo preview — as an employee, you'll apply and track leave requests here." />}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-background border rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-primary">{isDemo ? 20 : leaveBalance}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Leave Balance</div>
                        </div>
                        <div className="bg-background border rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">{isDemo ? 5 : usedLeave}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Used</div>
                        </div>
                        <div className="bg-background border rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-amber-500">{isDemo ? 1 : (leaves?.filter(l => l.status === "pending").length ?? 0)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Pending</div>
                        </div>
                      </div>
                      {isSelectedCurrentEmployer && (
                        <Button size="sm" className="w-full" disabled={isDemo} onClick={() => setLeaveDialog(true)}>
                          <Plus className="mr-2 h-4 w-4" /> Apply Leave
                        </Button>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Leave Requests</p>
                        {isDemo ? (
                          <div className="space-y-1.5">
                            {[
                              { type: "casual", from: "2026-05-10", to: "2026-05-10", days: 1, status: "approved" },
                              { type: "sick", from: "2026-04-22", to: "2026-04-23", days: 2, status: "approved" },
                              { type: "casual", from: "2026-06-02", to: "2026-06-02", days: 1, status: "pending" },
                            ].map((l, i) => (
                              <div key={i} className="flex items-center gap-3 text-xs p-2 bg-background rounded border">
                                <div className="flex-1"><span className="font-medium capitalize">{l.type} Leave</span><span className="text-muted-foreground ml-2">{l.from} → {l.to} ({l.days}d)</span></div>
                                <Badge variant={l.status === "approved" ? "default" : "secondary"} className="text-[10px] capitalize">{l.status}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {leaves?.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-4 text-center">No leave requests yet</p>
                            ) : leaves?.slice(0, 5).map(l => (
                              <div key={l.id} className="flex items-center gap-3 text-xs p-2 bg-background rounded border">
                                <div className="flex-1"><span className="font-medium capitalize">{l.leaveType} Leave</span><span className="text-muted-foreground ml-2">{l.startDate} → {l.endDate} ({l.days}d)</span></div>
                                <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] capitalize">{l.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* ── Rota ── */}
                    <TabsContent value="rota">
                      {isDemo && <DemoBanner text="Demo preview — your weekly schedule will appear here once assigned by HR." />}
                      <p className="text-xs font-semibold text-muted-foreground mb-3">Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</p>
                      <div className="grid grid-cols-7 gap-1">
                        {weekDays.map((day, i) => {
                          const dayStr = format(day, "yyyy-MM-dd");
                          const rec = attendance?.find(a => a.date.startsWith(dayStr));
                          const isToday = dayStr === todayStr;
                          const demoShifts = ["09:00–18:00", "09:00–18:00", "OFF", "09:00–13:00", "09:00–18:00", "OFF", "OFF"];
                          return (
                            <div key={i} className={`flex flex-col items-center p-2 rounded-lg border text-center ${isToday ? "border-primary bg-primary/5" : "bg-background"}`}>
                              <span className="text-[10px] font-medium text-muted-foreground">{format(day, "EEE")}</span>
                              <span className={`text-sm font-bold mt-0.5 ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</span>
                              <div className="mt-1.5">
                                {isDemo ? (
                                  <span className={`text-[9px] font-medium ${demoShifts[i] === "OFF" ? "text-red-500" : "text-green-600"}`}>{demoShifts[i]}</span>
                                ) : rec ? (
                                  <Badge variant={rec.status === "present" ? "default" : rec.status === "absent" ? "destructive" : "secondary"} className="text-[8px] px-1 py-0">{rec.status === "present" ? "✓" : rec.status === "half_day" ? "½" : "✗"}</Badge>
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
                      {isDemo && <DemoBanner text="Demo preview — your payslips and tax documents from this employer will appear here." />}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payslips</p>
                        <div className="space-y-1.5">
                          {DEMO_PAYSLIPS.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs p-2.5 bg-background rounded-lg border">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1"><span className="font-medium">{p.period}</span><span className="text-muted-foreground ml-3">Gross: {p.gross} · Net: {p.net}</span></div>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"><Download className="h-3 w-3" /> Download</Button>
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
                              <div className="flex-1"><span className="font-medium">{d.name}</span><span className="text-muted-foreground ml-2">· {d.date}</span></div>
                              <Badge variant="outline" className="text-[10px] shrink-0">{d.type}</Badge>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"><Download className="h-3 w-3" /> Download</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── Summary ── */}
                    <TabsContent value="summary" className="space-y-4">
                      {isDemo && <DemoBanner text="Demo preview — request certificates and official letters from this employer." />}
                      <div className="border rounded-lg p-4 bg-muted/10 space-y-3">
                        <p className="text-sm font-semibold">Request a Certificate / Letter</p>
                        <div>
                          <Label className="text-xs mb-1 block">Document Type</Label>
                          <Select value={certType} onValueChange={setCertType}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select document to request..." /></SelectTrigger>
                            <SelectContent>
                              {CERT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Note / Reason (optional)</Label>
                          <Textarea placeholder="e.g. Required for visa application..." className="text-xs resize-none min-h-[60px]" value={certNote} onChange={e => setCertNote(e.target.value)} />
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
                                <div className="flex-1"><span className="font-medium">{r.type}</span><span className="text-muted-foreground ml-2">· {r.date}</span></div>
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
            )}
          </>
        )}

        {/* Apply Leave Dialog */}
        <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Leave Type</Label>
                <Select value={leaveForm.leaveType} onValueChange={v => setLeaveForm(f => ({ ...f, leaveType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["casual", "sick", "annual", "maternity", "paternity", "unpaid"].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)} Leave</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Start Date</Label><Input type="date" className="mt-1" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><Label className="text-xs">End Date</Label><Input type="date" className="mt-1" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div><Label className="text-xs">Reason (optional)</Label><Textarea className="mt-1 resize-none min-h-[80px] text-sm" placeholder="Reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setLeaveDialog(false)}>Cancel</Button>
                <Button className="flex-1" disabled={isApplyingLeave || !leaveForm.startDate || !leaveForm.endDate} onClick={handleApplyLeave}>
                  {isApplyingLeave && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
