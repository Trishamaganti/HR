import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useListAttendance, useListEmployees, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, getDaysInMonth, addMonths, subMonths } from "date-fns";
import {
  Search, X, Clock, LogIn, LogOut, MapPin, User, CheckCircle2,
  ChevronLeft, ChevronRight, LayoutList, CalendarDays,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";

// Static sites — shared with rota (reads from localStorage if available)
function getSites(): { id: string; name: string }[] {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("ihr_rota_v2_")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        if (parsed.sites?.length) return parsed.sites;
      }
    }
  } catch {}
  return [
    { id: "main", name: "Main Office" },
    { id: "london", name: "London Office" },
    { id: "remote", name: "Remote" },
  ];
}

// ─── Monthly Overview ────────────────────────────────────────────────────────
function MonthlyOverview({
  attendance,
  employees,
}: {
  attendance: any[];
  employees: any[];
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const [searchEmp, setSearchEmp] = useState("");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-based
  const daysInMonth = getDaysInMonth(viewDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filter attendance for this month
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthAttendance = useMemo(
    () => attendance.filter(r => r.date.startsWith(monthStr)),
    [attendance, monthStr]
  );

  // Build lookup: employeeId → day → record
  const lookup = useMemo(() => {
    const map = new Map<number, Map<number, any>>();
    for (const r of monthAttendance) {
      const day = parseInt(r.date.split("-")[2]);
      if (!map.has(r.employeeId)) map.set(r.employeeId, new Map());
      map.get(r.employeeId)!.set(day, r);
    }
    return map;
  }, [monthAttendance]);

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const filteredEmployees = employees.filter(e =>
    !searchEmp ||
    (e.fullName ?? "").toLowerCase().includes(searchEmp.toLowerCase()) ||
    (e.employeeCode ?? "").toLowerCase().includes(searchEmp.toLowerCase())
  );

  // Summary counts for the month
  const presentCount = monthAttendance.filter(r => r.status === "present" || r.status === "late").length;
  const absentCount = monthAttendance.filter(r => r.status === "absent").length;
  const uniquePresentDays = new Set(monthAttendance.filter(r => r.status === "present" || r.status === "late").map(r => r.date)).size;

  function cellContent(empId: number, day: number) {
    const rec = lookup.get(empId)?.get(day);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isFuture = new Date(dateStr) > today && !(year === todayY && month === todayM && day === todayD);
    const isToday = year === todayY && month === todayM && day === todayD;
    const dow = new Date(dateStr).getDay(); // 0=Sun,6=Sat
    const isWeekend = dow === 0 || dow === 6;

    if (rec) {
      if (rec.status === "present" || rec.status === "late") {
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[9px] font-bold text-white">P</div>
            {rec.punchIn && <div className="text-[8px] text-green-700 leading-none">{format(new Date(rec.punchIn), 'HH:mm')}</div>}
          </div>
        );
      }
      if (rec.status === "absent") {
        return <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-[9px] font-bold text-red-600">A</div>;
      }
      if (rec.status === "half_day") {
        return <div className="w-6 h-6 rounded-full bg-yellow-100 border border-yellow-300 flex items-center justify-center text-[9px] font-bold text-yellow-700">H</div>;
      }
      return <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-500">?</div>;
    }
    if (isWeekend) return <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">–</div>;
    if (isFuture) return <div className="w-5 h-5 rounded bg-muted/40 flex items-center justify-center text-[8px] text-muted-foreground/40">·</div>;
    if (isToday) return <div className="w-6 h-6 rounded-full border-2 border-primary/40 flex items-center justify-center text-[9px] text-primary/60">?</div>;
    // Past day with no record → absent
    return <div className="w-6 h-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-[9px] font-bold text-red-400">A</div>;
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewDate(d => subMonths(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold w-44 text-center">{format(viewDate, "MMMM yyyy")}</div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewDate(d => addMonths(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setViewDate(new Date())}>Today</Button>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            <span className="text-muted-foreground">Present: <strong className="text-foreground">{presentCount}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
            <span className="text-muted-foreground">Absent: <strong className="text-foreground">{absentCount}</strong></span>
          </span>
          <span className="text-muted-foreground">Working days: <strong className="text-foreground">{uniquePresentDays}</strong></span>
        </div>
      </div>

      {/* Employee search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Filter employees…" value={searchEmp} onChange={e => setSearchEmp(e.target.value)} className="pl-8 h-8 text-sm" />
        {searchEmp && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchEmp("")}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/80 text-left px-3 py-2.5 font-semibold border-b border-r min-w-[180px]">
                Employee
              </th>
              {days.map(d => {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const dow = new Date(dateStr).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isToday = year === todayY && month === todayM && d === todayD;
                return (
                  <th
                    key={d}
                    className={`px-1 py-2 text-center font-medium border-b min-w-[42px] ${isWeekend ? "text-muted-foreground/50 bg-slate-50" : isToday ? "bg-primary/5 text-primary" : ""}`}
                  >
                    <div>{["Su","Mo","Tu","We","Th","Fr","Sa"][dow]}</div>
                    <div className={`text-[11px] font-bold mt-0.5 ${isToday ? "bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center mx-auto" : ""}`}>{d}</div>
                  </th>
                );
              })}
              <th className="px-3 py-2.5 text-center font-semibold border-b border-l min-w-[80px]">Summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={days.length + 2} className="text-center py-8 text-muted-foreground">
                  No employees found.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, idx) => {
                const empRecs = lookup.get(emp.id);
                const presentDays = empRecs
                  ? [...empRecs.values()].filter(r => r.status === "present" || r.status === "late").length
                  : 0;
                const absentDays = empRecs
                  ? [...empRecs.values()].filter(r => r.status === "absent").length
                  : 0;
                return (
                  <tr key={emp.id} className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-muted/20"} hover:bg-primary/5 transition-colors`}>
                    <td className="sticky left-0 z-10 px-3 py-2 border-r bg-inherit">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(emp.fullName ?? "?")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium truncate max-w-[120px]">{emp.fullName}</div>
                          <div className="text-muted-foreground text-[10px]">{emp.employeeCode ?? ""}</div>
                        </div>
                      </div>
                    </td>
                    {days.map(d => (
                      <td key={d} className="px-0.5 py-1.5 text-center border-r border-muted/30">
                        <div className="flex items-center justify-center">
                          {cellContent(emp.id, d)}
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center border-l">
                      <div className="text-green-600 font-semibold text-xs">{presentDays}P</div>
                      <div className="text-red-500 font-semibold text-[10px]">{absentDays}A</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[9px] text-white font-bold">P</span> Present (with punch-in time)</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-[9px] text-red-600 font-bold">A</span> Absent</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-yellow-100 border border-yellow-300 flex items-center justify-center text-[9px] text-yellow-700 font-bold">H</span> Half Day</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">–</span> Weekend</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full border-2 border-primary/40 flex items-center justify-center text-[9px] text-primary/60">?</span> Today (no punch yet)</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HrAttendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const BASE = getApiUrl();
  const today = format(new Date(), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState("");

  // Clock-in modal state
  const [clockOpen, setClockOpen] = useState(false);
  const [clockType, setClockType] = useState<"punch_in" | "punch_out">("punch_in");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [clockLoading, setClockLoading] = useState(false);

  const { data: attendance, isLoading } = useListAttendance(
    { date: undefined } as any,
    { query: { queryKey: getListAttendanceQueryKey({ date: undefined } as any) } }
  );
  const { data: employees } = useListEmployees({});
  const sites = getSites();

  const filtered = (attendance ?? []).filter(r => {
    const inRange = (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo);
    if (!inRange) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.employeeName ?? "").toLowerCase().includes(q) ||
      ((r as any).employeeCode ?? "").toLowerCase().includes(q) ||
      r.employeeId.toString().includes(q)
    );
  });

  const presets = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: format(subDays(new Date(), 1), "yyyy-MM-dd"), to: format(subDays(new Date(), 1), "yyyy-MM-dd") },
    { label: "Last 7 Days", from: format(subDays(new Date(), 6), "yyyy-MM-dd"), to: today },
    { label: "Last 30 Days", from: format(subDays(new Date(), 29), "yyyy-MM-dd"), to: today },
  ];

  // Stats
  const todayRecs = (attendance ?? []).filter(r => r.date === today);
  const presentToday = todayRecs.filter(r => r.punchIn).length;
  const stillIn = todayRecs.filter(r => r.punchIn && !r.punchOut).length;
  const avgHours = todayRecs.filter(r => r.hoursWorked).reduce((a, b, _, arr) => {
    return a + (b.hoursWorked ?? 0) / arr.length;
  }, 0);

  const handleClock = async () => {
    if (!selectedEmpId) { toast({ variant: "destructive", title: "Please select an employee" }); return; }
    setClockLoading(true);
    try {
      const r = await fetch(`${BASE}/attendance/punch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: parseInt(selectedEmpId),
          type: clockType,
          location: selectedSite || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      await queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ date: undefined } as any) });
      toast({
        title: clockType === "punch_in" ? "✓ Clocked In" : "✓ Clocked Out",
        description: `${employees?.find(e => e.id === parseInt(selectedEmpId))?.fullName ?? "Employee"} — ${format(new Date(), "HH:mm")}`,
      });
      setClockOpen(false);
      setSelectedEmpId("");
      setSelectedSite("");
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message ?? "Error recording attendance" });
    } finally {
      setClockLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Attendance</h1>
            <p className="text-muted-foreground">Monitor daily punch-ins and working hours.</p>
          </div>
          <Dialog open={clockOpen} onOpenChange={setClockOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Clock className="h-4 w-4" /> Clock In / Out
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Manual Clock In / Out
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                  <button
                    onClick={() => setClockType("punch_in")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      clockType === "punch_in"
                        ? "bg-green-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LogIn className="h-4 w-4" /> Clock In
                  </button>
                  <button
                    onClick={() => setClockType("punch_out")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      clockType === "punch_out"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LogOut className="h-4 w-4" /> Clock Out
                  </button>
                </div>

                {/* Employee select */}
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Employee *
                  </Label>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select employee…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees ?? []).map(e => (
                        <SelectItem key={e.id} value={e.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                              {(e.fullName ?? "?")[0]}
                            </div>
                            <span>{e.fullName}</span>
                            {e.designation && <span className="text-xs text-muted-foreground">· {e.designation}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Site select — only for punch in */}
                {clockType === "punch_in" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Location / Site
                    </Label>
                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select site…" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Field">Field Work</SelectItem>
                        <SelectItem value="Client Site">Client Site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Time display */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Recording time</p>
                    <p className="text-sm font-semibold">{format(new Date(), "EEEE, d MMMM yyyy · HH:mm")}</p>
                  </div>
                </div>

                <Button
                  onClick={handleClock}
                  disabled={clockLoading || !selectedEmpId}
                  className={`w-full h-11 gap-2 font-semibold ${
                    clockType === "punch_in"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                >
                  {clockLoading ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  ) : clockType === "punch_in" ? (
                    <><LogIn className="h-4 w-4" /> Confirm Clock In</>
                  ) : (
                    <><LogOut className="h-4 w-4" /> Confirm Clock Out</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Present Today", value: presentToday, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { label: "Still Clocked In", value: stillIn, icon: LogIn, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Avg Hours", value: avgHours > 0 ? `${avgHours.toFixed(1)}h` : "—", icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Total Records", value: filtered.length, icon: User, color: "text-orange-600", bg: "bg-orange-50" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="daily">
          <TabsList className="h-9">
            <TabsTrigger value="daily" className="gap-1.5 text-xs">
              <LayoutList className="h-3.5 w-3.5" /> Daily View
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5" /> Monthly Overview
            </TabsTrigger>
          </TabsList>

          {/* ── Daily View ── */}
          <TabsContent value="daily" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-muted-foreground">Quick:</span>
                  {presets.map(p => (
                    <Button
                      key={p.label}
                      variant={dateFrom === p.from && dateTo === p.to ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From Date</Label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 h-9" />
                  </div>
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, Emp ID…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
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
                        <TableHead>Emp ID</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Location / Site</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Punch In</TableHead>
                        <TableHead>Punch Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {attendance?.length === 0
                              ? "No attendance records found. Use the Clock In / Out button to record attendance."
                              : "No records match your search."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {(record as any).employeeCode ?? `#${record.employeeId}`}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                  {(record.employeeName ?? "?")[0]?.toUpperCase()}
                                </div>
                                <span className="font-medium text-sm">{record.employeeName ?? `Employee #${record.employeeId}`}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {(record as any).location ? (
                                <Badge variant="outline" className="font-normal text-xs gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {(record as any).location}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>{format(new Date(record.date + "T00:00:00"), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              {record.punchIn ? (
                                <span className="text-green-600 font-medium text-sm">{format(new Date(record.punchIn), 'HH:mm')}</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {record.punchOut ? (
                                <span className="text-orange-500 font-medium text-sm">{format(new Date(record.punchOut), 'HH:mm')}</span>
                              ) : record.punchIn ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5 animate-pulse">In Progress</Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {record.hoursWorked ? (
                                <span className="font-medium">{record.hoursWorked}h</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  record.status === "present" ? "default" :
                                  record.status === "late" ? "secondary" :
                                  record.status === "absent" ? "destructive" : "outline"
                                }
                                className="capitalize"
                              >
                                {record.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {!isLoading && filtered.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                Showing {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                {dateFrom === dateTo
                  ? ` for ${format(new Date(dateFrom + "T00:00:00"), "MMM d, yyyy")}`
                  : ` from ${format(new Date(dateFrom + "T00:00:00"), "MMM d")} to ${format(new Date(dateTo + "T00:00:00"), "MMM d, yyyy")}`}
              </p>
            )}
          </TabsContent>

          {/* ── Monthly Overview ── */}
          <TabsContent value="monthly" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Monthly Attendance Overview
                </CardTitle>
                <p className="text-xs text-muted-foreground">Browse any month to see all employees' present / absent status day-by-day.</p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <MonthlyOverview attendance={attendance ?? []} employees={employees ?? []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
