import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import {
  useGetEmployeeDashboardStats, useListApplications, useGetCompany,
  getListApplicationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar, FileText, Bell, CheckCircle, Building2, CheckCircle2,
  ArrowRightLeft, Lock, Briefcase,
} from "lucide-react";

type OrgEntry = {
  companyId: number;
  companyName: string;
  jobTitle?: string;
  status: "current" | "past";
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { switchToWork, workHomePath } = useViewMode();
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string>("");

  const canManage = !!user && ["owner", "manager", "hr", "admin"].includes(user.role);

  const { data: stats, isLoading: statsLoading } = useGetEmployeeDashboardStats({
    query: { queryKey: ["employeeStats"] },
  });

  const appParams = { candidateId: user?.id ?? undefined };
  const { data: applications } = useListApplications(appParams, {
    query: { enabled: !!user?.id, queryKey: getListApplicationsQueryKey(appParams) },
  });

  // Build org list
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
      });
    }
  });

  const effectiveId = selectedId || String(orgs[0]?.companyId ?? "");
  const selectedOrg = orgs.find((o) => String(o.companyId) === effectiveId) ?? orgs[0];
  const isCurrentOrg = selectedOrg?.status === "current";

  const { data: company } = useGetCompany(selectedOrg?.companyId ?? 0, {
    query: { enabled: !!selectedOrg?.companyId },
  });

  const companyDisplayName = isCurrentOrg
    ? (company?.name ?? "Your Company")
    : (selectedOrg?.companyName ?? "Past Company");

  const handleSwitch = () => {
    if (canManage) {
      switchToWork();
      setLocation(workHomePath);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header + Org selector */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
          </div>

          {/* Org selector row — always visible */}
          <div className="flex items-center gap-3 flex-wrap">
            {orgs.length > 0 && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Select value={effectiveId} onValueChange={setSelectedId}>
                  <SelectTrigger className="h-10 w-full max-w-xs">
                    <SelectValue>
                      {selectedOrg && (
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCurrentOrg ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                          }`}>
                            {companyDisplayName.charAt(0)}
                          </div>
                          <span className="truncate text-sm">{companyDisplayName}</span>
                          {isCurrentOrg && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org) => {
                      const displayName = org.status === "current" && company?.name ? company.name : org.companyName;
                      return (
                        <SelectItem key={org.companyId} value={String(org.companyId)} className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
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

                <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 text-xs">
                  <Building2 className="h-3 w-3" />
                  {companyDisplayName}
                  {isCurrentOrg
                    ? <span className="text-green-600 font-semibold">· Active</span>
                    : <span className="text-muted-foreground">· Past</span>}
                </Badge>
              </div>
            )}

            {/* Switch to Manage button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto">
                  <Button
                    size="sm"
                    variant={canManage ? "default" : "outline"}
                    disabled={!canManage}
                    onClick={handleSwitch}
                    className={`gap-1.5 ${!canManage ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {canManage ? (
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
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

          {/* Past org notice */}
          {!isCurrentOrg && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Briefcase className="h-4 w-4 shrink-0" />
              Viewing past employment at <strong className="ml-1">{companyDisplayName}</strong>. Stats below reflect your current employment.
            </div>
          )}
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.leaveBalance} Days</div>
                <p className="text-xs text-muted-foreground mt-1">Available to use</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.attendanceDays} Days</div>
                <p className="text-xs text-muted-foreground mt-1">Present this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Payslip</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.payslipMonth}</div>
                <p className="text-xs text-muted-foreground mt-1">Current period</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Announcements + Holidays */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.announcements && stats.announcements.length > 0 ? (
                <ul className="space-y-4">
                  {stats.announcements.map((ann, i) => (
                    <li key={i} className="flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                      <p className="text-sm">{ann}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No new announcements
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Upcoming Holidays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.upcomingHolidays && stats.upcomingHolidays.length > 0 ? (
                <ul className="space-y-4">
                  {stats.upcomingHolidays.map((hol, i) => (
                    <li key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <span className="font-medium text-sm">{hol}</span>
                      <span className="text-xs text-muted-foreground">Company Holiday</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No upcoming holidays in the next 30 days
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
