import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useListEmployees, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Eye, Plus, Crown, Briefcase, User, ChevronDown,
  Trash2, CheckCircle2, PauseCircle, XCircle, Building2, Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";

type AccessLevel = "owner" | "manager" | "employee";
type EmployeeStatus = "active" | "inactive" | "suspended";

const ACCESS_LEVELS: { value: AccessLevel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "owner", label: "Owner", icon: <Crown className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "manager", label: "Manager", icon: <Briefcase className="h-3.5 w-3.5" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "employee", label: "Employee", icon: <User className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
];

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  active: {
    label: "Active",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    badgeClass: "bg-[#683FE0] hover:bg-[#5832c4] text-white border-0 cursor-pointer",
  },
  inactive: {
    label: "Inactive",
    icon: <XCircle className="h-3.5 w-3.5" />,
    badgeClass: "bg-gray-200 hover:bg-gray-300 text-gray-700 border-0 cursor-pointer",
  },
  suspended: {
    label: "Suspended",
    icon: <PauseCircle className="h-3.5 w-3.5" />,
    badgeClass: "bg-amber-100 hover:bg-amber-200 text-amber-800 border-0 cursor-pointer",
  },
};

function AccessBadge({ level }: { level: AccessLevel }) {
  const config = ACCESS_LEVELS.find(a => a.value === level) ?? ACCESS_LEVELS[2];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

type TeamDialogState = { open: boolean; empName: string; empId: number } | null;
type DeleteDialogState = { empId: number; empName: string } | null;
type OrgSuspendDialog = { open: boolean } | null;

export default function HrEmployees() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const { data: employees, isLoading } = useListEmployees({}, { query: { queryKey: getListEmployeesQueryKey() } });

  const [accessLevels, setAccessLevels] = useState<Record<number, AccessLevel>>({});
  const [statuses, setStatuses] = useState<Record<number, EmployeeStatus>>({});
  const [orgSuspended, setOrgSuspended] = useState(false);
  const [teamDialog, setTeamDialog] = useState<TeamDialogState>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [orgSuspendDialog, setOrgSuspendDialog] = useState<OrgSuspendDialog>(null);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [reportingTo, setReportingTo] = useState<Record<number, number[]>>({});

  const canAssignRoles = user?.role === "owner" || user?.role === "admin" || user?.role === "hr";
  const canAssignOwner = user?.role === "owner" || user?.role === "admin";

  const filteredEmployees = (employees ?? [])
    .filter(emp =>
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.toLowerCase().includes(search.toLowerCase()) ||
      (emp.email ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const getEffectiveAccess = (empId: number, defaultRole?: string): AccessLevel => {
    if (accessLevels[empId]) return accessLevels[empId];
    if (defaultRole === "owner" || defaultRole === "admin") return "owner";
    if (defaultRole === "manager" || defaultRole === "hr") return "manager";
    return "employee";
  };

  const getEffectiveStatus = (empId: number, defaultStatus?: string): EmployeeStatus => {
    if (orgSuspended) return "suspended";
    if (statuses[empId]) return statuses[empId];
    if (defaultStatus === "inactive") return "inactive";
    if (defaultStatus === "suspended") return "suspended";
    return "active";
  };

  const handleAccessChange = async (empId: number, empName: string, value: AccessLevel) => {
    setAccessLevels(prev => ({ ...prev, [empId]: value }));
    try {
      const res = await fetch(`/api/employees/${empId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel: value }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      if (value === "manager") setTeamDialog({ open: true, empName, empId });
      toast({ title: "Access updated", description: `${empName} has been assigned ${value} access.` });
    } catch {
      setAccessLevels(prev => { const next = { ...prev }; delete next[empId]; return next; });
      toast({ title: "Error", description: "Failed to update access level. Please try again.", variant: "destructive" });
    }
  };

  const handleStatusChange = (empId: number, empName: string, newStatus: EmployeeStatus) => {
    setStatuses(prev => ({ ...prev, [empId]: newStatus }));
    const msgs: Record<EmployeeStatus, string> = {
      active: `${empName} has been set to Active.`,
      inactive: `${empName} has been marked as Inactive.`,
      suspended: `${empName}'s account has been Suspended.`,
    };
    toast({ title: "Status updated", description: msgs[newStatus] });
  };

  const handleOrgSuspend = () => {
    if (!verifyEmail || verifyEmail !== user?.email) {
      toast({ variant: "destructive", title: "Email does not match", description: "Please enter your registered email to confirm." });
      return;
    }
    setOrgSuspended(true);
    setOrgSuspendDialog(null);
    setVerifyEmail("");
    toast({
      variant: "destructive",
      title: "Organisation Suspended",
      description: "All employee accounts have been suspended pending reactivation.",
    });
  };

  const handleOrgReactivate = () => {
    setOrgSuspended(false);
    toast({ title: "Organisation Reactivated", description: "All employee accounts have been restored to active." });
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await fetch(`${getApiUrl()}/employees/${deleteDialog.empId}`, { method: "DELETE" });
      toast({ title: "Employee deleted", description: `${deleteDialog.empName} has been removed.`, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["hrStats"] });
    } catch {
      toast({ variant: "destructive", title: "Delete failed", description: "Could not delete employee. Please try again." });
    }
    setDeleteDialog(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Directory</h1>
            <p className="text-muted-foreground">Manage all employee records and access levels.</p>
          </div>
          <div className="flex gap-4">
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[250px]"
            />
            <Button onClick={() => setAddEmployeeOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
          </div>
        </div>

        {orgSuspended && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
            <PauseCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="flex-1">
              <strong>Organisation is suspended.</strong> All employee accounts are currently suspended.
            </span>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleOrgReactivate}>
              Reactivate
            </Button>
          </div>
        )}

        {canAssignRoles && !orgSuspended && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
            <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              As <strong>{user?.role === "owner" ? "Owner" : "Manager"}</strong>, you can assign access levels and manage employee status.
              {user?.role === "owner" && " Owners can also grant Owner-level access."}
            </span>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isOrgAdmin = emp.employeeCode === "EMP000";
                      const effectiveAccess = getEffectiveAccess(emp.id, undefined);
                      const effectiveStatus = getEffectiveStatus(emp.id, emp.status);
                      const isCurrentUser = emp.email === user?.email;
                      const isManager = effectiveAccess === "manager";
                      const reportCount = reportingTo[emp.id]?.length ?? 0;
                      const statusCfg = STATUS_CONFIG[effectiveStatus];

                      return (
                        <TableRow key={emp.id} className={orgSuspended && !isOrgAdmin ? "opacity-60" : ""}>
                          {/* Employee name */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={undefined} />
                                <AvatarFallback>{emp.fullName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium flex items-center gap-1.5">
                                  {emp.fullName}
                                  {isCurrentUser && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">You</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">{emp.email}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs">{emp.employeeCode || '-'}</TableCell>
                          <TableCell>{emp.department || '-'}</TableCell>
                          <TableCell className="text-sm">{emp.designation || '-'}</TableCell>

                          {/* Access Level */}
                          <TableCell>
                            {isOrgAdmin ? (
                              /* Org Admin row: show "Organisation" badge */
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium text-indigo-700 bg-indigo-50 border-indigo-200">
                                <Building2 className="h-3.5 w-3.5" />
                                Organisation
                              </span>
                            ) : canAssignRoles ? (
                              <div className="space-y-1">
                                <Select
                                  value={effectiveAccess}
                                  onValueChange={(v) => handleAccessChange(emp.id, emp.fullName, v as AccessLevel)}
                                >
                                  <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ACCESS_LEVELS.filter(a => canAssignOwner || a.value !== "owner").map(a => (
                                      <SelectItem key={a.value} value={a.value} className="text-xs">
                                        <span className="flex items-center gap-1.5">{a.icon} {a.label}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isManager && (
                                  <button
                                    className="text-[10px] text-primary underline"
                                    onClick={() => setTeamDialog({ open: true, empName: emp.fullName, empId: emp.id })}
                                  >
                                    {reportCount > 0 ? `${reportCount} staff reporting` : "Assign team"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <AccessBadge level={effectiveAccess} />
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {isOrgAdmin && canAssignRoles ? (
                              /* Org Admin: only Active / Suspended + org-wide cascade */
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${statusCfg.badgeClass}`}
                                  >
                                    {statusCfg.icon}
                                    {statusCfg.label}
                                    <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                  <DropdownMenuItem
                                    className="gap-2 text-xs"
                                    onClick={handleOrgReactivate}
                                    disabled={!orgSuspended}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#683FE0]" />
                                    Set Active
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-xs text-amber-700 focus:text-amber-700"
                                    onClick={() => setOrgSuspendDialog({ open: true })}
                                    disabled={orgSuspended}
                                  >
                                    <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                                    Suspend Organisation
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : canAssignRoles && !isCurrentUser && !orgSuspended ? (
                              /* Regular employees: Active / Inactive / Suspended */
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${statusCfg.badgeClass}`}
                                  >
                                    {statusCfg.icon}
                                    {statusCfg.label}
                                    <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40">
                                  <DropdownMenuItem className="gap-2 text-xs" onClick={() => handleStatusChange(emp.id, emp.fullName, "active")}>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#683FE0]" /> Set Active
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 text-xs" onClick={() => handleStatusChange(emp.id, emp.fullName, "inactive")}>
                                    <XCircle className="h-3.5 w-3.5 text-gray-500" /> Set Inactive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 text-xs" onClick={() => handleStatusChange(emp.id, emp.fullName, "suspended")}>
                                    <PauseCircle className="h-3.5 w-3.5 text-amber-600" /> Suspend
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.badgeClass.replace("cursor-pointer", "")}`}>
                                {statusCfg.icon}
                                {statusCfg.label}
                              </span>
                            )}
                          </TableCell>

                          {/* View */}
                          <TableCell>
                            <Link href={`/hr/employees/${emp.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="mr-1.5 h-4 w-4" /> View
                              </Button>
                            </Link>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            {canAssignRoles && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={isOrgAdmin || isCurrentUser}
                                onClick={() => !isOrgAdmin && !isCurrentUser && setDeleteDialog({ empId: emp.id, empName: emp.fullName })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Team Assignment Dialog */}
        <Dialog open={!!teamDialog?.open} onOpenChange={(open) => !open && setTeamDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Team to {teamDialog?.empName}</DialogTitle>
              <DialogDescription>Select which employees will report to this manager.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredEmployees.filter(e => e.id !== teamDialog?.empId).map(e => {
                const isReporting = teamDialog ? (reportingTo[teamDialog.empId] ?? []).includes(e.id) : false;
                return (
                  <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{e.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{e.fullName}</p>
                        <p className="text-xs text-muted-foreground">{e.designation || e.department || "—"}</p>
                      </div>
                    </div>
                    <Button
                      size="sm" variant={isReporting ? "default" : "outline"} className="h-7 text-xs"
                      onClick={() => {
                        if (!teamDialog) return;
                        setReportingTo(prev => {
                          const current = prev[teamDialog.empId] ?? [];
                          const updated = isReporting ? current.filter(id => id !== e.id) : [...current, e.id];
                          return { ...prev, [teamDialog.empId]: updated };
                        });
                      }}
                    >
                      {isReporting ? "Assigned" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={() => { toast({ title: "Team saved", description: `Team assigned to ${teamDialog?.empName}.` }); setTeamDialog(null); }}>
                Save Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Org Suspend Confirmation + Email Verification */}
        <Dialog open={!!orgSuspendDialog?.open} onOpenChange={(open) => { if (!open) { setOrgSuspendDialog(null); setVerifyEmail(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <PauseCircle className="h-5 w-5" /> Suspend Organisation
              </DialogTitle>
              <DialogDescription>
                This will suspend <strong>all employee accounts</strong> in the organisation until reactivated. Verify your identity to proceed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                Enter your registered email address to confirm.
              </div>
              <div>
                <Label className="text-xs">Your Email Address</Label>
                <Input
                  className="mt-1"
                  type="email"
                  placeholder={user?.email ?? "admin@company.com"}
                  value={verifyEmail}
                  onChange={e => setVerifyEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setOrgSuspendDialog(null); setVerifyEmail(""); }}>Cancel</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleOrgSuspend}
                disabled={!verifyEmail}
              >
                <PauseCircle className="mr-2 h-4 w-4" /> Confirm Suspension
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" /> Delete Employee
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete <strong>{deleteDialog?.empName}</strong>? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      <AddEmployeeDialog open={addEmployeeOpen} onClose={() => setAddEmployeeOpen(false)} />
      </div>
    </DashboardLayout>
  );
}
