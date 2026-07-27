import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useGetEmployee, useUpdateEmployee, getGetEmployeeQueryKey, useListEmployees, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Save, User, Briefcase, DollarSign, Phone, Building2,
  Plus, Trash2, TrendingUp, ArrowUpRight, MapPin, RefreshCw, UserMinus,
  UserCheck, Star, CreditCard, Shield, Home, AlertTriangle, Users,
  Award, GiftIcon, Calendar, GitBranch, ChevronRight, ChevronDown, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

// Defined at module level so React never treats them as new component types on re-render
function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2 mt-6 first:mt-0">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>
  );
}

const EVENT_TYPES = [
  { value: "joined",       label: "Joined",          icon: UserCheck,    color: "bg-green-100 text-green-700 border-green-300",    dot: "bg-green-500" },
  { value: "promoted",     label: "Promoted",         icon: TrendingUp,   color: "bg-purple-100 text-purple-700 border-purple-300",  dot: "bg-purple-500" },
  { value: "role_change",  label: "Role Change",      icon: RefreshCw,    color: "bg-blue-100 text-blue-700 border-blue-300",       dot: "bg-blue-500" },
  { value: "salary_hike",  label: "Salary Hike",      icon: DollarSign,   color: "bg-amber-100 text-amber-700 border-amber-300",    dot: "bg-amber-500" },
  { value: "increment",    label: "Increment",        icon: Award,        color: "bg-lime-100 text-lime-700 border-lime-300",       dot: "bg-lime-500" },
  { value: "bonus",        label: "Bonus",            icon: GiftIcon,     color: "bg-pink-100 text-pink-700 border-pink-300",       dot: "bg-pink-500" },
  { value: "transferred",  label: "Transferred",      icon: ArrowUpRight, color: "bg-cyan-100 text-cyan-700 border-cyan-300",       dot: "bg-cyan-500" },
  { value: "confirmation", label: "Confirmation",     icon: Shield,       color: "bg-indigo-100 text-indigo-700 border-indigo-300", dot: "bg-indigo-500" },
  { value: "resigned",     label: "Resigned",         icon: UserMinus,    color: "bg-orange-100 text-orange-700 border-orange-300", dot: "bg-orange-500" },
  { value: "terminated",   label: "Terminated",       icon: UserMinus,    color: "bg-red-100 text-red-700 border-red-300",          dot: "bg-red-500" },
  { value: "other",        label: "Other",            icon: Star,         color: "bg-gray-100 text-gray-700 border-gray-300",       dot: "bg-gray-400" },
];

const getEventCfg = (type: string) => EVENT_TYPES.find(e => e.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];

function useCareerHistory(employeeId: number) {
  return useQuery({
    queryKey: ["career-history", employeeId],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/employees/${employeeId}/career`);
      if (!res.ok) throw new Error("Failed to load career history");
      return res.json() as Promise<any[]>;
    },
    enabled: !!employeeId,
  });
}

function useAddCareerEvent(employeeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${getApiUrl()}/employees/${employeeId}/career`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add event");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["career-history", employeeId] }),
  });
}

function useDeleteCareerEvent(employeeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch(`${getApiUrl()}/employees/${employeeId}/career/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["career-history", employeeId] }),
  });
}

const BLANK_FORM = {
  // Personal
  firstName: "", middleName: "", lastName: "", fullName: "",
  email: "", employeeCode: "", dob: "",
  mobileNumber: "", personalEmail: "",
  // Address
  address: "", city: "", state: "", pincode: "", country: "",
  // Emergency contact
  emergencyContactName: "", emergencyContactRelation: "", emergencyContactNumber: "",
  // Position
  department: "", designation: "", jobTitle: "", grade: "", band: "",
  employmentType: "", location: "", status: "active",
  joiningDate: "", positionUpdatedDate: "", probationEndDate: "", confirmationDate: "", doe: "",
  // Reporting
  reportingManager: "", reportingManagerId: "",
  // Office contact
  ofcEmail: "", ofcNumber: "",
  // Compensation
  salary: "", basicSalary: "", hra: "", transportAllowance: "", medicalAllowance: "", specialAllowance: "",
  salaryUpdatedDate: "",
  // Bank
  bankName: "", bankAccountNumber: "", bankIfscCode: "", bankAccountType: "",
  // National IDs
  panNumber: "", aadharNumber: "", passportNumber: "", uan: "", esicNumber: "",
  // Misc
  notes: "",
};

const BLANK_EVENT = {
  eventType: "joined", date: "", effectiveDate: "",
  title: "", designation: "", department: "", grade: "", band: "", location: "", employmentType: "",
  salary: "", basicSalary: "", incrementAmount: "", incrementPercentage: "", bonusAmount: "",
  reportingManagerId: "", reportingManager: "",
  notes: "",
};

type TabKey = "info" | "position" | "compensation" | "contact" | "documents" | "career";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "info",         label: "Personal",     icon: User },
  { key: "position",     label: "Position",     icon: Briefcase },
  { key: "compensation", label: "Compensation", icon: DollarSign },
  { key: "contact",      label: "Contact",      icon: Phone },
  { key: "documents",    label: "Documents",    icon: Shield },
  { key: "career",       label: "Career Timeline", icon: TrendingUp },
];

/* ── Organisation Profile (shown for EMP000 Org Admin) ── */
type Director = { id: string; name: string; title: string; email: string; phone: string };
type OrgNode = { empId: string; reportsTo: string };

function OrgProfileView({ employees }: { employees: any[] }) {
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "TxSprint",
    dateFormed: "2021-01-01",
    registrationNumber: "",
    companyType: "",
    industry: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    phone: "",
    email: "",
  });

  const [directors, setDirectors] = useState<Director[]>([
    { id: "d1", name: "", title: "Director", email: "", phone: "" },
  ]);

  const [orgChart, setOrgChart] = useState<OrgNode[]>([]);
  const [orgTab, setOrgTab] = useState<"company" | "directors" | "orgchart">("company");
  const [saved, setSaved] = useState(false);

  const ci = (key: keyof typeof companyInfo) => ({
    value: companyInfo[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setCompanyInfo(p => ({ ...p, [key]: e.target.value })),
  });

  const addDirector = () =>
    setDirectors(d => [...d, { id: `d${Date.now()}`, name: "", title: "Director", email: "", phone: "" }]);

  const updateDirector = (id: string, key: keyof Director, val: string) =>
    setDirectors(d => d.map(x => x.id === id ? { ...x, [key]: val } : x));

  const removeDirector = (id: string) =>
    setDirectors(d => d.filter(x => x.id !== id));

  const empOptions = employees.filter(e => e.employeeCode !== "EMP000");

  const getNodeReport = (empId: string) =>
    orgChart.find(n => n.empId === empId)?.reportsTo ?? "__none__";

  const setNodeReport = (empId: string, reportsTo: string) =>
    setOrgChart(prev => {
      const existing = prev.find(n => n.empId === empId);
      if (existing) return prev.map(n => n.empId === empId ? { ...n, reportsTo } : n);
      return [...prev, { empId, reportsTo }];
    });

  const orgTabs = [
    { key: "company" as const, label: "Company Info", icon: Building2 },
    { key: "directors" as const, label: "Directors", icon: Users },
    { key: "orgchart" as const, label: "Org Flow Chart", icon: GitBranch },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b gap-1 flex-wrap">
        {orgTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setOrgTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              orgTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Company Info Tab ── */}
      {orgTab === "company" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> Formation & Registration
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label className="text-xs">Company Name</Label><Input className="mt-1" {...ci("companyName")} placeholder="e.g. TxSprint Ltd" /></div>
                <div><Label className="text-xs">Date Company Formed</Label><Input className="mt-1" type="date" {...ci("dateFormed")} /></div>
                <div><Label className="text-xs">Registration Number</Label><Input className="mt-1" {...ci("registrationNumber")} placeholder="CIN / Registration No." /></div>
                <div><Label className="text-xs">Company Type</Label><Input className="mt-1" {...ci("companyType")} placeholder="e.g. Private Limited" /></div>
                <div><Label className="text-xs">Industry</Label><Input className="mt-1" {...ci("industry")} placeholder="e.g. Technology" /></div>
                <div><Label className="text-xs">Website</Label><Input className="mt-1" {...ci("website")} placeholder="https://example.com" /></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> Registered Company Address
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Label className="text-xs">Address Line</Label><Input className="mt-1" {...ci("address")} placeholder="Street / Building / Floor" /></div>
                <div><Label className="text-xs">City</Label><Input className="mt-1" {...ci("city")} /></div>
                <div><Label className="text-xs">State / Province</Label><Input className="mt-1" {...ci("state")} /></div>
                <div><Label className="text-xs">Pincode / ZIP</Label><Input className="mt-1" {...ci("pincode")} /></div>
                <div><Label className="text-xs">Country</Label><Input className="mt-1" {...ci("country")} placeholder="India" /></div>
                <div><Label className="text-xs">Company Phone</Label><Input className="mt-1" {...ci("phone")} /></div>
                <div><Label className="text-xs">Company Email</Label><Input className="mt-1" type="email" {...ci("email")} /></div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setSaved(true)} type="button">
                <Save className="mr-2 h-4 w-4" /> Save Company Info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Directors Tab ── */}
      {orgTab === "directors" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Directors & Key Personnel
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addDirector}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Director
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {directors.map((dir, idx) => (
              <div key={dir.id} className="rounded-xl border p-4 space-y-4 relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Director {idx + 1}
                  </p>
                  {directors.length > 1 && (
                    <button
                      className="text-red-400 hover:text-red-600 transition-colors"
                      onClick={() => removeDirector(dir.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input className="mt-1" value={dir.name} onChange={e => updateDirector(dir.id, "name", e.target.value)} placeholder="Director's full name" />
                  </div>
                  <div>
                    <Label className="text-xs">Title / Designation</Label>
                    <Input className="mt-1" value={dir.title} onChange={e => updateDirector(dir.id, "title", e.target.value)} placeholder="e.g. Managing Director" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input className="mt-1" type="email" value={dir.email} onChange={e => updateDirector(dir.id, "email", e.target.value)} placeholder="director@company.com" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input className="mt-1" value={dir.phone} onChange={e => updateDirector(dir.id, "phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button onClick={() => setSaved(true)} type="button">
                <Save className="mr-2 h-4 w-4" /> Save Directors
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Org Flow Chart Tab ── */}
      {orgTab === "orgchart" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> Organisation Flow Chart
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign each employee's reporting line. Select who each person reports to.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Org Admin at top */}
            <div className="rounded-xl border bg-primary/5 border-primary/20 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">O</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Org Admin <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-1">EMP000</span></p>
                <p className="text-xs text-muted-foreground">Top of hierarchy — reports to no one</p>
              </div>
              <span className="text-xs text-muted-foreground italic">Root</span>
            </div>

            {empOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No other employees to configure.</p>
            ) : (
              empOptions.map((emp, i) => {
                const currentReport = getNodeReport(emp.id.toString());
                const otherEmps = empOptions.filter(e => e.id !== emp.id);
                return (
                  <div key={emp.id} className="rounded-xl border p-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                      style={{ background: i % 3 === 0 ? "#683FE0" : i % 3 === 1 ? "#D7A364" : "#E4CA70", color: i % 3 === 2 ? "#333" : "white" }}
                    >
                      {emp.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation || emp.department || emp.employeeCode}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground mr-1">Reports to</div>
                      <Select value={currentReport} onValueChange={v => setNodeReport(emp.id.toString(), v)}>
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs">— Org Admin (Root) —</SelectItem>
                          {otherEmps.map(mgr => (
                            <SelectItem key={mgr.id} value={mgr.id.toString()} className="text-xs">
                              {mgr.fullName} · {mgr.employeeCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSaved(true)} type="button">
                <Save className="mr-2 h-4 w-4" /> Save Org Chart
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {saved && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50">
          <Shield className="h-4 w-4" /> Changes saved successfully
        </div>
      )}
    </div>
  );
}

export default function HrEmployeeDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useGetEmployee(
    id,
    { query: { enabled: !!id, queryKey: getGetEmployeeQueryKey(id) } }
  );

  const allParams = { companyId: employee?.companyId };
  const { data: allEmployees } = useListEmployees(
    allParams,
    { query: { enabled: !!employee?.companyId, queryKey: getListEmployeesQueryKey(allParams) } }
  );

  const updateMutation = useUpdateEmployee();
  const { data: careerHistory, isLoading: careerLoading } = useCareerHistory(id);
  const addEvent = useAddCareerEvent(id);
  const deleteEvent = useDeleteCareerEvent(id);

  const [form, setForm] = useState(BLANK_FORM);
  const [newEvent, setNewEvent] = useState(BLANK_EVENT);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("info");

  useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName ?? "",
        middleName: employee.middleName ?? "",
        lastName: employee.lastName ?? "",
        fullName: employee.fullName ?? "",
        email: employee.email ?? "",
        employeeCode: employee.employeeCode ?? "",
        dob: employee.dob ?? "",
        mobileNumber: (employee as any).mobileNumber ?? "",
        personalEmail: (employee as any).personalEmail ?? "",
        address: (employee as any).address ?? "",
        city: (employee as any).city ?? "",
        state: (employee as any).state ?? "",
        pincode: (employee as any).pincode ?? "",
        country: (employee as any).country ?? "",
        emergencyContactName: (employee as any).emergencyContactName ?? "",
        emergencyContactRelation: (employee as any).emergencyContactRelation ?? "",
        emergencyContactNumber: (employee as any).emergencyContactNumber ?? "",
        department: employee.department ?? "",
        designation: employee.designation ?? "",
        jobTitle: employee.jobTitle ?? "",
        grade: (employee as any).grade ?? "",
        band: (employee as any).band ?? "",
        employmentType: (employee as any).employmentType ?? "",
        location: (employee as any).location ?? "",
        status: employee.status ?? "active",
        joiningDate: employee.joiningDate ?? "",
        positionUpdatedDate: employee.positionUpdatedDate ?? "",
        probationEndDate: (employee as any).probationEndDate ?? "",
        confirmationDate: (employee as any).confirmationDate ?? "",
        doe: employee.doe ?? "",
        reportingManager: employee.reportingManager ?? "",
        reportingManagerId: employee.reportingManagerId?.toString() ?? "",
        ofcEmail: employee.ofcEmail ?? "",
        ofcNumber: employee.ofcNumber ?? "",
        salary: employee.salary?.toString() ?? "",
        basicSalary: employee.basicSalary?.toString() ?? "",
        hra: (employee as any).hra?.toString() ?? "",
        transportAllowance: (employee as any).transportAllowance?.toString() ?? "",
        medicalAllowance: (employee as any).medicalAllowance?.toString() ?? "",
        specialAllowance: (employee as any).specialAllowance?.toString() ?? "",
        salaryUpdatedDate: employee.salaryUpdatedDate ?? "",
        bankName: (employee as any).bankName ?? "",
        bankAccountNumber: (employee as any).bankAccountNumber ?? "",
        bankIfscCode: (employee as any).bankIfscCode ?? "",
        bankAccountType: (employee as any).bankAccountType ?? "",
        panNumber: (employee as any).panNumber ?? "",
        aadharNumber: (employee as any).aadharNumber ?? "",
        passportNumber: (employee as any).passportNumber ?? "",
        uan: (employee as any).uan ?? "",
        esicNumber: (employee as any).esicNumber ?? "",
        notes: (employee as any).notes ?? "",
      });
    }
  }, [employee]);

  const fv = (key: keyof typeof form) => form[key];
  const fChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));
  const fi = (key: keyof typeof form) => ({ value: fv(key), onChange: fChange(key) });

  const toIntOrNull = (v: string) => v ? parseInt(v) : null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id,
      data: {
        firstName: form.firstName || null,
        middleName: form.middleName || null,
        lastName: form.lastName || null,
        designation: form.designation || null,
        jobTitle: form.jobTitle || null,
        department: form.department || null,
        grade: form.grade || null,
        band: form.band || null,
        employmentType: form.employmentType || null,
        location: form.location || null,
        status: form.status as any,
        joiningDate: form.joiningDate || null,
        positionUpdatedDate: form.positionUpdatedDate || null,
        probationEndDate: form.probationEndDate || null,
        confirmationDate: form.confirmationDate || null,
        doe: form.doe || null,
        dob: form.dob || null,
        salary: toIntOrNull(form.salary),
        basicSalary: toIntOrNull(form.basicSalary),
        hra: toIntOrNull(form.hra),
        transportAllowance: toIntOrNull(form.transportAllowance),
        medicalAllowance: toIntOrNull(form.medicalAllowance),
        specialAllowance: toIntOrNull(form.specialAllowance),
        salaryUpdatedDate: form.salaryUpdatedDate || null,
        reportingManager: form.reportingManager || null,
        reportingManagerId: toIntOrNull(form.reportingManagerId),
        ofcEmail: form.ofcEmail || null,
        ofcNumber: form.ofcNumber || null,
        mobileNumber: form.mobileNumber || null,
        personalEmail: form.personalEmail || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        country: form.country || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactRelation: form.emergencyContactRelation || null,
        emergencyContactNumber: form.emergencyContactNumber || null,
        bankName: form.bankName || null,
        bankAccountNumber: form.bankAccountNumber || null,
        bankIfscCode: form.bankIfscCode || null,
        bankAccountType: form.bankAccountType || null,
        panNumber: form.panNumber || null,
        aadharNumber: form.aadharNumber || null,
        passportNumber: form.passportNumber || null,
        uan: form.uan || null,
        esicNumber: form.esicNumber || null,
        notes: form.notes || null,
      } as any
    }, {
      onSuccess: () => {
        toast({ title: "Employee updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetEmployeeQueryKey(id) });
      },
      onError: () => toast({ variant: "destructive", title: "Update failed" }),
    });
  };

  const onAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.date || !newEvent.eventType) {
      toast({ variant: "destructive", title: "Date and event type are required" });
      return;
    }
    addEvent.mutate(
      {
        ...newEvent,
        salary: newEvent.salary ? parseInt(newEvent.salary) : undefined,
        basicSalary: newEvent.basicSalary ? parseInt(newEvent.basicSalary) : undefined,
        incrementAmount: newEvent.incrementAmount ? parseInt(newEvent.incrementAmount) : undefined,
        bonusAmount: newEvent.bonusAmount ? parseInt(newEvent.bonusAmount) : undefined,
        reportingManagerId: newEvent.reportingManagerId ? parseInt(newEvent.reportingManagerId) : undefined,
        effectiveDate: newEvent.effectiveDate || newEvent.date,
      },
      {
        onSuccess: () => {
          toast({ title: "Career event added" });
          setNewEvent(BLANK_EVENT);
          setShowAddEvent(false);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to add event" }),
      }
    );
  };

  const reportingManagerOptions = allEmployees?.filter(e => e.id !== id) ?? [];
  const directReports = allEmployees?.filter(e => e.reportingManagerId === id) ?? [];

  const isOrgAdmin = !!employee && (employee as any).employeeCode === "EMP000";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Link href="/hr/employees">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isOrgAdmin ? "Organisation Profile" : "Employee Profile"}
            </h1>
            {isOrgAdmin && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Company details, directors and organisation hierarchy
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[180px] w-full rounded-xl" />
            <Skeleton className="h-[500px] w-full rounded-xl" />
          </div>
        ) : !employee ? (
          <div className="text-center py-12 text-muted-foreground">Employee not found.</div>
        ) : isOrgAdmin ? (
          <>
            {/* Org Admin header card */}
            <Card>
              <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
                <div className="h-24 w-24 rounded-full shrink-0 flex items-center justify-center text-white font-black text-2xl shadow"
                  style={{ background: "linear-gradient(135deg, #683FE0 0%, #D7A364 100%)" }}>
                  {employee.fullName.charAt(0)}
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h2 className="text-2xl font-bold">{employee.fullName}</h2>
                    <p className="text-muted-foreground">{employee.designation} · {employee.department}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs">
                      {employee.employeeCode}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#683FE0] text-white">
                      Organisation Admin
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Viewing this record shows the organisation details rather than a personal employee profile.
                  </p>
                </div>
              </CardContent>
            </Card>

            <OrgProfileView employees={allEmployees ?? []} />
          </>
        ) : (
          <>
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
                <Avatar className="h-24 w-24 shrink-0">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {employee.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold">{employee.fullName}</h2>
                    <p className="text-muted-foreground">
                      {employee.jobTitle || employee.designation || "—"} · {employee.department}
                      {(employee as any).grade ? ` · Grade ${(employee as any).grade}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs">
                      {employee.employeeCode}
                    </span>
                    <Badge variant={employee.status === "active" ? "default" : "secondary"} className="capitalize text-xs">
                      {employee.status}
                    </Badge>
                    {(employee as any).employmentType && (
                      <Badge variant="outline" className="capitalize text-xs">
                        {(employee as any).employmentType.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {employee.joiningDate && (
                      <div><span className="text-xs text-muted-foreground block">Joining Date</span><p className="text-sm font-medium">{employee.joiningDate}</p></div>
                    )}
                    {employee.dob && (
                      <div><span className="text-xs text-muted-foreground block">Date of Birth</span><p className="text-sm font-medium">{employee.dob}</p></div>
                    )}
                    {employee.basicSalary && (
                      <div><span className="text-xs text-muted-foreground block">Basic Salary</span><p className="text-sm font-medium">₹{employee.basicSalary.toLocaleString()}</p></div>
                    )}
                    {employee.reportingManager && (
                      <div><span className="text-xs text-muted-foreground block">Reports To</span><p className="text-sm font-medium">{employee.reportingManager}</p></div>
                    )}
                  </div>
                  {directReports.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{directReports.length} direct report{directReports.length !== 1 ? "s" : ""}: {directReports.map(r => r.fullName).join(", ")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex border-b gap-1 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.key === "career" && (
                    <span className="ml-0.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {careerHistory?.length ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit}>
              {/* ── PERSONAL TAB ── */}
              {activeTab === "info" && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <SectionLabel icon={User}>Identity</SectionLabel>
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field label="First Name"><Input {...fi("firstName")} /></Field>
                        <Field label="Middle Name"><Input {...fi("middleName")} /></Field>
                        <Field label="Last Name"><Input {...fi("lastName")} /></Field>
                        <Field label="Date of Birth"><Input type="date" {...fi("dob")} /></Field>
                        <Field label="Login Email">
                          <Input {...fi("email")} disabled className="bg-muted/40" />
                        </Field>
                        <Field label="Personal Email"><Input type="email" {...fi("personalEmail")} /></Field>
                        <Field label="Mobile Number"><Input {...fi("mobileNumber")} /></Field>
                        <Field label="Status">
                          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="on_leave">On Leave</SelectItem>
                              <SelectItem value="resigned">Resigned</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>
                    <div>
                      <SectionLabel icon={Home}>Address</SectionLabel>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Address Line">
                          <Input {...fi("address")} placeholder="House / Flat / Street" />
                        </Field>
                        <Field label="City"><Input {...fi("city")} /></Field>
                        <Field label="State"><Input {...fi("state")} /></Field>
                        <Field label="Pincode"><Input {...fi("pincode")} /></Field>
                        <Field label="Country"><Input {...fi("country")} placeholder="India" /></Field>
                      </div>
                    </div>
                    <div>
                      <SectionLabel icon={AlertTriangle}>Emergency Contact</SectionLabel>
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field label="Contact Name"><Input {...fi("emergencyContactName")} /></Field>
                        <Field label="Relation"><Input {...fi("emergencyContactRelation")} placeholder="e.g. Spouse, Parent" /></Field>
                        <Field label="Contact Number"><Input {...fi("emergencyContactNumber")} /></Field>
                      </div>
                    </div>
                    <div>
                      <SectionLabel icon={User}>Notes</SectionLabel>
                      <Textarea {...fi("notes")} rows={3} placeholder="Internal HR notes about this employee…" />
                    </div>
                    <SaveBar isPending={updateMutation.isPending} />
                  </CardContent>
                </Card>
              )}

              {/* ── POSITION TAB ── */}
              {activeTab === "position" && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> Position & Department</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <SectionLabel icon={Briefcase}>Role</SectionLabel>
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field label="Job Title"><Input {...fi("jobTitle")} placeholder="e.g. Senior Engineer" /></Field>
                        <Field label="Designation"><Input {...fi("designation")} placeholder="e.g. SDE-2" /></Field>
                        <Field label="Department"><Input {...fi("department")} /></Field>
                        <Field label="Grade"><Input {...fi("grade")} placeholder="e.g. L4" /></Field>
                        <Field label="Band"><Input {...fi("band")} placeholder="e.g. B3" /></Field>
                        <Field label="Work Location"><Input {...fi("location")} placeholder="e.g. Chennai HQ" /></Field>
                        <Field label="Employment Type">
                          <Select value={form.employmentType || "__none__"} onValueChange={v => setForm(p => ({ ...p, employmentType: v === "__none__" ? "" : v }))}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Not set —</SelectItem>
                              <SelectItem value="full_time">Full Time</SelectItem>
                              <SelectItem value="part_time">Part Time</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="intern">Intern</SelectItem>
                              <SelectItem value="probation">Probation</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>
                    <div>
                      <SectionLabel icon={Building2}>Dates</SectionLabel>
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field label="Date of Joining (DOJ)"><Input type="date" {...fi("joiningDate")} /></Field>
                        <Field label="Probation End Date"><Input type="date" {...fi("probationEndDate")} /></Field>
                        <Field label="Confirmation Date"><Input type="date" {...fi("confirmationDate")} /></Field>
                        <Field label="Position Updated Date"><Input type="date" {...fi("positionUpdatedDate")} /></Field>
                        <Field label="Date of Exit (DOE)"><Input type="date" {...fi("doe")} /></Field>
                      </div>
                    </div>
                    <div>
                      <SectionLabel icon={Users}>Reporting Manager</SectionLabel>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Select Reporting Manager">
                          <Select value={form.reportingManagerId || "__none__"} onValueChange={v => {
                            const mgr = reportingManagerOptions.find(e => e.id.toString() === v);
                            setForm(p => ({ ...p, reportingManagerId: v === "__none__" ? "" : v, reportingManager: v === "__none__" ? "" : (mgr?.fullName ?? "") }));
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select reporting manager" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— None —</SelectItem>
                              {reportingManagerOptions.map(e => (
                                <SelectItem key={e.id} value={e.id.toString()}>
                                  {e.fullName} · {e.designation || e.jobTitle || e.employeeCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Manager Name (auto-filled)">
                          <Input {...fi("reportingManager")} placeholder="Auto-filled from dropdown" />
                        </Field>
                      </div>
                      {directReports.length > 0 && (
                        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Direct Reports ({directReports.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {directReports.map(r => (
                              <Link key={r.id} href={`/hr/employees/${r.id}`}>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 cursor-pointer transition-colors">
                                  {r.fullName} ({r.employeeCode})
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <SaveBar isPending={updateMutation.isPending} />
                  </CardContent>
                </Card>
              )}

              {/* ── COMPENSATION TAB ── */}
              {activeTab === "compensation" && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Compensation & Salary</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <SectionLabel icon={DollarSign}>Salary Breakdown</SectionLabel>
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field label="Basic Salary (₹)"><Input type="number" {...fi("basicSalary")} placeholder="e.g. 40000" /></Field>
                        <Field label="HRA (₹)"><Input type="number" {...fi("hra")} placeholder="e.g. 16000" /></Field>
                        <Field label="Transport Allowance (₹)"><Input type="number" {...fi("transportAllowance")} placeholder="e.g. 2000" /></Field>
                        <Field label="Medical Allowance (₹)"><Input type="number" {...fi("medicalAllowance")} placeholder="e.g. 1250" /></Field>
                        <Field label="Special Allowance (₹)"><Input type="number" {...fi("specialAllowance")} /></Field>
                        <Field label="Total Gross Salary (₹)"><Input type="number" {...fi("salary")} placeholder="Total CTC / gross" /></Field>
                        <Field label="Salary Updated Date"><Input type="date" {...fi("salaryUpdatedDate")} /></Field>
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 text-sm">
                      <p className="font-semibold mb-1 text-muted-foreground text-xs uppercase tracking-wide">Computed CTC</p>
                      <p className="text-2xl font-bold">
                        ₹{[
                          parseInt(form.basicSalary || "0"),
                          parseInt(form.hra || "0"),
                          parseInt(form.transportAllowance || "0"),
                          parseInt(form.medicalAllowance || "0"),
                          parseInt(form.specialAllowance || "0"),
                        ].reduce((a, b) => a + b, 0).toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground"> / month</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Annual: ₹{([
                          parseInt(form.basicSalary || "0"),
                          parseInt(form.hra || "0"),
                          parseInt(form.transportAllowance || "0"),
                          parseInt(form.medicalAllowance || "0"),
                          parseInt(form.specialAllowance || "0"),
                        ].reduce((a, b) => a + b, 0) * 12).toLocaleString()}
                      </p>
                    </div>
                    <SaveBar isPending={updateMutation.isPending} />
                  </CardContent>
                </Card>
              )}

              {/* ── CONTACT TAB ── */}
              {activeTab === "contact" && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> Contact Information</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <SectionLabel icon={Building2}>Office Contact</SectionLabel>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Office Email"><Input type="email" {...fi("ofcEmail")} /></Field>
                        <Field label="Office Phone"><Input {...fi("ofcNumber")} /></Field>
                      </div>
                    </div>
                    <div>
                      <SectionLabel icon={Phone}>Personal Contact</SectionLabel>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Personal Mobile"><Input {...fi("mobileNumber")} /></Field>
                        <Field label="Personal Email"><Input type="email" {...fi("personalEmail")} /></Field>
                      </div>
                    </div>
                    <SaveBar isPending={updateMutation.isPending} />
                  </CardContent>
                </Card>
              )}

              {/* ── DOCUMENTS TAB ── */}
              {activeTab === "documents" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Bank Details</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Bank Name"><Input {...fi("bankName")} placeholder="e.g. HDFC Bank" /></Field>
                        <Field label="Account Number"><Input {...fi("bankAccountNumber")} /></Field>
                        <Field label="IFSC Code"><Input {...fi("bankIfscCode")} placeholder="e.g. HDFC0001234" /></Field>
                        <Field label="Account Type">
                          <Select value={form.bankAccountType || "__none__"} onValueChange={v => setForm(p => ({ ...p, bankAccountType: v === "__none__" ? "" : v }))}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Not set —</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                              <SelectItem value="current">Current</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> National IDs & Statutory</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="PAN Number"><Input {...fi("panNumber")} placeholder="ABCDE1234F" /></Field>
                        <Field label="Aadhar Number"><Input {...fi("aadharNumber")} placeholder="XXXX XXXX XXXX" /></Field>
                        <Field label="Passport Number"><Input {...fi("passportNumber")} /></Field>
                        <Field label="UAN (PF)"><Input {...fi("uan")} placeholder="Universal Account Number" /></Field>
                        <Field label="ESIC Number"><Input {...fi("esicNumber")} /></Field>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-end">
                    <SaveBar isPending={updateMutation.isPending} />
                  </div>
                </div>
              )}
            </form>

            {/* ── CAREER TIMELINE TAB ── */}
            {activeTab === "career" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Career Movement Timeline
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowAddEvent(v => !v)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add Event
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add event form */}
                  {showAddEvent && (
                    <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
                      <p className="text-sm font-semibold">Record New Career Event</p>
                      <form onSubmit={onAddEvent} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Event Type *</Label>
                            <Select value={newEvent.eventType} onValueChange={v => setNewEvent(p => ({ ...p, eventType: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {EVENT_TYPES.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Date of Event *</Label>
                            <Input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Effective Date</Label>
                            <Input type="date" value={newEvent.effectiveDate} onChange={e => setNewEvent(p => ({ ...p, effectiveDate: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Title / Role Description</Label>
                            <Input placeholder="e.g. Promoted to Senior Executive" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">New Designation</Label>
                            <Input placeholder="e.g. Senior Executive" value={newEvent.designation} onChange={e => setNewEvent(p => ({ ...p, designation: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Department</Label>
                            <Input placeholder="e.g. Operations" value={newEvent.department} onChange={e => setNewEvent(p => ({ ...p, department: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Grade</Label>
                            <Input placeholder="e.g. L5" value={newEvent.grade} onChange={e => setNewEvent(p => ({ ...p, grade: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Band</Label>
                            <Input placeholder="e.g. B4" value={newEvent.band} onChange={e => setNewEvent(p => ({ ...p, band: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Location</Label>
                            <Input placeholder="e.g. Mumbai Office" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Employment Type</Label>
                            <Select value={newEvent.employmentType || "__none__"} onValueChange={v => setNewEvent(p => ({ ...p, employmentType: v === "__none__" ? "" : v }))}>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Not set —</SelectItem>
                                <SelectItem value="full_time">Full Time</SelectItem>
                                <SelectItem value="part_time">Part Time</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="intern">Intern</SelectItem>
                                <SelectItem value="probation">Probation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Compensation at this Event</p>
                          <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">New Gross Salary (₹)</Label>
                              <Input type="number" placeholder="e.g. 75000" value={newEvent.salary} onChange={e => setNewEvent(p => ({ ...p, salary: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Basic Salary (₹)</Label>
                              <Input type="number" placeholder="e.g. 35000" value={newEvent.basicSalary} onChange={e => setNewEvent(p => ({ ...p, basicSalary: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Increment Amount (₹)</Label>
                              <Input type="number" placeholder="e.g. 5000" value={newEvent.incrementAmount} onChange={e => setNewEvent(p => ({ ...p, incrementAmount: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Increment %</Label>
                              <Input placeholder="e.g. 12.5%" value={newEvent.incrementPercentage} onChange={e => setNewEvent(p => ({ ...p, incrementPercentage: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Bonus Amount (₹)</Label>
                              <Input type="number" placeholder="e.g. 25000" value={newEvent.bonusAmount} onChange={e => setNewEvent(p => ({ ...p, bonusAmount: e.target.value }))} />
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Reporting Manager at this Event</p>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Reporting Manager</Label>
                              <Select value={newEvent.reportingManagerId || "__none__"} onValueChange={v => {
                                const mgr = reportingManagerOptions.find(e => e.id.toString() === v);
                                setNewEvent(p => ({ ...p, reportingManagerId: v === "__none__" ? "" : v, reportingManager: v === "__none__" ? "" : (mgr?.fullName ?? "") }));
                              }}>
                                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— None —</SelectItem>
                                  {reportingManagerOptions.map(e => (
                                    <SelectItem key={e.id} value={e.id.toString()}>
                                      {e.fullName} · {e.designation || e.employeeCode}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Manager Name</Label>
                              <Input value={newEvent.reportingManager} onChange={e => setNewEvent(p => ({ ...p, reportingManager: e.target.value }))} placeholder="Auto-filled from selection" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Notes</Label>
                          <Textarea
                            placeholder="Additional notes about this career event…"
                            value={newEvent.notes}
                            onChange={e => setNewEvent(p => ({ ...p, notes: e.target.value }))}
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddEvent(false)}>Cancel</Button>
                          <Button type="submit" size="sm" disabled={addEvent.isPending}>
                            {addEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                            Save Event
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Timeline */}
                  {careerLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                  ) : !careerHistory || careerHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No career events recorded yet.</p>
                      <p className="text-xs mt-1">Add events to track this employee's journey within the organisation.</p>
                      <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowAddEvent(true)}>
                        <Plus className="h-4 w-4 mr-1.5" /> Record First Event
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-0">
                        {[...careerHistory].reverse().map((event) => {
                          const cfg = getEventCfg(event.eventType);
                          const Icon = cfg.icon;
                          return (
                            <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                              <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${cfg.color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5 bg-white border rounded-xl p-3 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>
                                      {event.title && <span className="text-sm font-semibold">{event.title}</span>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date((event.effectiveDate ?? event.date) + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                      {event.effectiveDate && event.effectiveDate !== event.date && (
                                        <span className="ml-1 text-muted-foreground/60">(announced {new Date(event.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })})</span>
                                      )}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteEvent.mutate(event.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                  {event.designation && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Briefcase className="h-3 w-3" /> {event.designation}
                                    </span>
                                  )}
                                  {event.department && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Building2 className="h-3 w-3" /> {event.department}
                                    </span>
                                  )}
                                  {event.location && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" /> {event.location}
                                    </span>
                                  )}
                                  {event.grade && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Award className="h-3 w-3" /> Grade {event.grade}{event.band ? ` / Band ${event.band}` : ""}
                                    </span>
                                  )}
                                  {event.reportingManager && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Users className="h-3 w-3" /> Reports to: {event.reportingManager}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  {event.salary && (
                                    <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" /> ₹{event.salary.toLocaleString()} gross
                                    </span>
                                  )}
                                  {event.incrementAmount && (
                                    <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" /> +₹{event.incrementAmount.toLocaleString()} increment
                                      {event.incrementPercentage ? ` (${event.incrementPercentage})` : ""}
                                    </span>
                                  )}
                                  {event.bonusAmount && (
                                    <span className="text-xs font-medium text-pink-700 flex items-center gap-1">
                                      <GiftIcon className="h-3 w-3" /> ₹{event.bonusAmount.toLocaleString()} bonus
                                    </span>
                                  )}
                                </div>
                                {event.notes && (
                                  <p className="text-xs text-muted-foreground mt-1.5 italic">{event.notes}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SaveBar({ isPending }: { isPending: boolean }) {
  return (
    <div className="flex justify-end pt-4 border-t">
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Changes
      </Button>
    </div>
  );
}
