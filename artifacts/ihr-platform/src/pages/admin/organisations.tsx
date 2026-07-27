import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import {
  useListCompanies,
  useUpdateCompany,
  useGetSuperAdminStats,
  getListCompaniesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, DollarSign, TrendingUp, Search, Eye,
  ShieldBan, ShieldCheck, Loader2, Globe, Filter, Calendar,
  CheckCircle2, XCircle, Clock, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";

const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string; price: number }> = {
  starter:      { label: "Starter",      color: "text-gray-600",   bg: "bg-gray-50",   border: "border-gray-200",   price: 29 },
  growth:       { label: "Growth",       color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200",   price: 99 },
  professional: { label: "Professional", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", price: 199 },
  enterprise:   { label: "Enterprise",   color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  price: 499 },
};

const STATUS_META: Record<string, { icon: JSX.Element; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  active:    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "default" },
  suspended: { icon: <XCircle className="h-3.5 w-3.5" />,     variant: "destructive" },
  pending:   { icon: <Clock className="h-3.5 w-3.5" />,       variant: "secondary" },
};

function PlanBadge({ plan }: { plan: string | null }) {
  const meta = PLAN_META[plan ?? "starter"] ?? PLAN_META.starter;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.color} ${meta.bg} ${meta.border}`}>
      {meta.label}
    </span>
  );
}

function HealthBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default function AdminOrganisations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const { data: companies, isLoading: companiesLoading } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() },
  });
  const { data: stats, isLoading: statsLoading } = useGetSuperAdminStats({
    query: { queryKey: ["adminStats"] },
  });
  const updateMutation = useUpdateCompany();

  const filtered = useMemo(() => {
    if (!companies) return [];
    return companies.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry?.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchPlan = planFilter === "all" || (c.plan ?? "starter") === planFilter;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [companies, search, statusFilter, planFilter]);

  const handleToggleStatus = (companyId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    setUpdatingId(companyId);
    updateMutation.mutate(
      { id: companyId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Status updated", description: `Organisation is now ${newStatus}.` });
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["adminStats"] });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Update failed", description: "Could not change organisation status." });
        },
        onSettled: () => setUpdatingId(null),
      }
    );
  };

  const totalMRR = companies
    ? companies.reduce((sum, c) => sum + (PLAN_META[c.plan ?? "starter"]?.price ?? 29), 0)
    : 0;

  const planBreakdown = useMemo(() => {
    if (!companies) return [];
    const counts: Record<string, number> = {};
    for (const c of companies) {
      const p = c.plan ?? "starter";
      counts[p] = (counts[p] || 0) + 1;
    }
    return Object.entries(counts).map(([plan, count]) => ({ plan, count }));
  }, [companies]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organisations Tracker</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage every organisation using the iHR platform.
            </p>
          </div>
          <Badge variant="outline" className="mt-1.5 text-xs shrink-0">
            {companiesLoading ? "—" : `${companies?.length ?? 0} total`}
          </Badge>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Total Organisations",
              icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
              value: statsLoading ? null : stats?.totalCompanies ?? 0,
              sub: statsLoading ? null : `${stats?.activeCompanies ?? 0} active`,
            },
            {
              title: "Active Organisations",
              icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
              value: statsLoading ? null : stats?.activeCompanies ?? 0,
              sub: statsLoading ? null : `${stats?.suspendedCompanies ?? 0} suspended`,
            },
            {
              title: "Total Users",
              icon: <Users className="h-4 w-4 text-muted-foreground" />,
              value: statsLoading ? null : stats?.totalUsers ?? 0,
              sub: "across all organisations",
            },
            {
              title: "Monthly Revenue",
              icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
              value: statsLoading ? null : `$${totalMRR.toLocaleString()}`,
              sub: "estimated MRR",
            },
          ].map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                {card.value === null ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Table — 3/4 width */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, industry or slug…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    className="appearance-none h-10 pl-3 pr-8 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    className="appearance-none h-10 pl-3 pr-8 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                  >
                    <option value="all">All plans</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              {(search || statusFilter !== "all" || planFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(""); setStatusFilter("all"); setPlanFilter("all"); }}
                  className="text-muted-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {companiesLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No organisations found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>Organisation</TableHead>
                          <TableHead>Industry</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Employees</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Health</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((company) => {
                          const statusMeta = STATUS_META[company.status] ?? STATUS_META.active;
                          const joinedDate = company.createdAt
                            ? format(new Date(company.createdAt), "d MMM yyyy")
                            : "—";
                          const healthScore = Math.min(
                            100,
                            20 + Math.min((company.employeeCount ?? 0) * 4, 60) +
                              (company.status === "active" ? 20 : 0)
                          );

                          return (
                            <TableRow key={company.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-sm font-bold text-primary">
                                      {company.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">{company.name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{company.slug}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                  <Globe className="h-3.5 w-3.5 shrink-0" />
                                  {company.industry ?? "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <PlanBadge plan={company.plan} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">{company.employeeCount ?? 0}</span>
                                  {company.companySize && (
                                    <span className="text-xs text-muted-foreground">/ {company.companySize}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                                  {joinedDate}
                                </div>
                              </TableCell>
                              <TableCell>
                                <HealthBar value={healthScore} />
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusMeta.variant} className="gap-1 capitalize">
                                  {statusMeta.icon}
                                  {company.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Link href={`/admin/companies/${company.id}`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View details">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleToggleStatus(company.id, company.status)}
                                    disabled={updatingId === company.id}
                                    title={company.status === "active" ? "Suspend" : "Activate"}
                                  >
                                    {updatingId === company.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : company.status === "active" ? (
                                      <ShieldBan className="h-4 w-4 text-destructive" />
                                    ) : (
                                      <ShieldCheck className="h-4 w-4 text-green-500" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {!companiesLoading && filtered.length > 0 && (
              <p className="text-xs text-muted-foreground text-right px-1">
                Showing {filtered.length} of {companies?.length ?? 0} organisations
              </p>
            )}
          </div>

          {/* Sidebar — 1/4 width */}
          <div className="space-y-4">
            {/* Plan breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Plan Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {companiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : planBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                ) : (
                  planBreakdown
                    .sort((a, b) => {
                      const order = ["starter", "growth", "professional", "enterprise"];
                      return order.indexOf(a.plan) - order.indexOf(b.plan);
                    })
                    .map(({ plan, count }) => {
                      const meta = PLAN_META[plan] ?? PLAN_META.starter;
                      const total = companies?.length ?? 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={plan}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{count} org{count !== 1 ? "s" : ""}</span>
                              <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${meta.bg.replace("bg-", "bg-").replace("-50", "-400")}`}
                              style={{ width: `${Math.max(pct, 3)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>

            {/* Status overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <>
                    {[
                      {
                        label: "Active",
                        count: stats?.activeCompanies ?? 0,
                        total: stats?.totalCompanies ?? 1,
                        color: "bg-green-500",
                        textColor: "text-green-600",
                      },
                      {
                        label: "Suspended",
                        count: stats?.suspendedCompanies ?? 0,
                        total: stats?.totalCompanies ?? 1,
                        color: "bg-red-400",
                        textColor: "text-red-600",
                      },
                      {
                        label: "Pending",
                        count: (stats?.totalCompanies ?? 0) - (stats?.activeCompanies ?? 0) - (stats?.suspendedCompanies ?? 0),
                        total: stats?.totalCompanies ?? 1,
                        color: "bg-amber-400",
                        textColor: "text-amber-600",
                      },
                    ].map(({ label, count, total, color, textColor }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={`font-semibold ${textColor}`}>{count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${color}`}
                              style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Revenue by plan */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Revenue by Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {companiesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  planBreakdown
                    .sort((a, b) => {
                      const order = ["enterprise", "professional", "growth", "starter"];
                      return order.indexOf(a.plan) - order.indexOf(b.plan);
                    })
                    .map(({ plan, count }) => {
                      const meta = PLAN_META[plan] ?? PLAN_META.starter;
                      const revenue = count * meta.price;
                      return (
                        <div key={plan} className="flex items-center justify-between py-1">
                          <div>
                            <PlanBadge plan={plan} />
                            <div className="text-xs text-muted-foreground mt-1">{count} org{count !== 1 ? "s" : ""} × ${meta.price}</div>
                          </div>
                          <div className="text-sm font-bold">${revenue.toLocaleString()}</div>
                        </div>
                      );
                    })
                )}
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Total MRR</span>
                  <span className="text-base font-bold text-primary">${totalMRR.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
