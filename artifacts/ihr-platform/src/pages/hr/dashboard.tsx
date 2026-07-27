import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import {
  useGetHrDashboardStats,
  useGetRecruitmentPipeline,
  useListLeaves,
  useListApplications,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users, Briefcase, FileText, UserCheck, UserMinus, Activity,
  Bell, CalendarOff, ClipboardList, ArrowRight, CheckCircle2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function HrDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetHrDashboardStats({ query: { queryKey: ["hrStats"] } });
  const { data: pipeline, isLoading: pipelineLoading } = useGetRecruitmentPipeline({ query: { queryKey: ["pipeline"] } });
  const { data: pendingLeaves, isLoading: leavesLoading } = useListLeaves(
    { status: "pending" },
    { query: { queryKey: ["pendingLeaves"] } }
  );
  const { data: recentApps, isLoading: appsLoading } = useListApplications(
    {},
    { query: { queryKey: ["recentApps"] } }
  );

  const newApps = recentApps?.filter(a => a.status === "applied").slice(0, 5) ?? [];
  const pendingCount = (pendingLeaves?.length ?? 0) + newApps.length;

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
          <p className="text-muted-foreground">Overview of your workforce and hiring pipeline.</p>
        </div>

        {/* KPI cards */}
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.openJobs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingApplications}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
                <UserMinus className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.absentToday || 0}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Pending Actions alert panel */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-amber-500" />
              Pending Actions
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-amber-500 hover:bg-amber-500 text-white text-xs px-1.5">
                  {pendingCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leavesLoading || appsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : pendingCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
                <p className="font-medium text-green-700">All caught up!</p>
                <p className="text-sm">No pending leave requests or new applications.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Pending leave requests */}
                {pendingLeaves && pendingLeaves.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <CalendarOff className="h-3.5 w-3.5" /> Leave Requests Awaiting Approval ({pendingLeaves.length})
                    </p>
                    {pendingLeaves.slice(0, 5).map((leave) => (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <CalendarOff className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium leading-tight">
                              Employee #{leave.employeeId} — {leave.leaveType ?? "Leave"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {leave.startDate ? format(new Date(leave.startDate), "MMM d") : "?"} →{" "}
                              {leave.endDate ? format(new Date(leave.endDate), "MMM d, yyyy") : "?"}
                              {leave.days ? ` · ${leave.days} day${leave.days !== 1 ? "s" : ""}` : ""}
                            </p>
                          </div>
                        </div>
                        <Link href="/hr/leaves">
                          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs gap-1">
                            Review <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {pendingLeaves.length > 5 && (
                      <Link href="/hr/leaves">
                        <p className="text-xs text-primary hover:underline cursor-pointer text-center pt-1">
                          +{pendingLeaves.length - 5} more leave requests
                        </p>
                      </Link>
                    )}
                  </>
                )}

                {/* New job applications */}
                {newApps.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" /> New Job Applications ({newApps.length})
                    </p>
                    {newApps.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <ClipboardList className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium leading-tight">
                              {(app as any).candidateName ?? `Candidate #${app.candidateId}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Job #{app.jobId} · Applied{" "}
                              {app.appliedAt ? formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true }) : ""}
                            </p>
                          </div>
                        </div>
                        <Link href="/hr/recruitment">
                          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50">
                            Review <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recruitment pipeline + Recent applications */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" /> Recruitment Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pipelineLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : pipeline && pipeline.stages && pipeline.stages.length > 0 ? (
                <div className="space-y-4">
                  {pipeline.stages.map((stage) => {
                    const percentage = Math.max((stage.count / pipeline.totalApplications) * 100, 2);
                    return (
                      <div key={stage.stage} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium capitalize">{stage.stage}</div>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-8 text-sm font-bold text-right">{stage.count}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recruitment data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {statsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : stats?.recentApplications && stats.recentApplications.length > 0 ? (
                  stats.recentApplications.map(app => (
                    <div key={app.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                      <div>
                        <p className="font-medium">{app.candidateName}</p>
                        <p className="text-sm text-muted-foreground">{app.jobTitle}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={app.status === "hired" ? "default" : "secondary"} className="capitalize">
                          {app.status}
                        </Badge>
                        {app.atsScore && (
                          <p className="text-xs font-semibold text-primary mt-1">{app.atsScore}% Match</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent applications
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

    </DashboardLayout>
  );
}
