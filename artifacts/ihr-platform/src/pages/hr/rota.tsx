import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useListEmployees } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, CalendarDays, Copy, Trash2, Save,
  Clock, Sun, Sunset, Moon, Users, Search, LayoutGrid, TableProperties,
  CheckCircle2, AlertCircle, Download, Plus, MapPin, Settings, X, Wand2,
} from "lucide-react";
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isBefore,
  addMonths, subMonths, startOfMonth, endOfMonth,
  isSameWeek, isToday, eachDayOfInterval,
} from "date-fns";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type ShiftCode = "shift1" | "shift2" | "shift3" | "off" | "";

type Site = {
  id: string;
  name: string;
  shiftDurationHours: number;
  shift1Start: string;
  shift2Start: string;
  shift3Start: string;
};

type EmpAllocations = Record<number, number>; // empId -> weekly allocated hours

type RotaMap = Record<string, ShiftCode>; // key: `${siteId}_${empId}_${yyyy-MM-dd}`

const SHIFT_DURATION_OPTIONS = [6, 8, 10, 12, 16, 24];

const DEFAULT_SITE: Omit<Site, "id" | "name"> = {
  shiftDurationHours: 8,
  shift1Start: "06:00",
  shift2Start: "14:00",
  shift3Start: "22:00",
};

function makeShiftEnd(start: string, duration: number): string {
  const [h, m] = start.split(":").map(Number);
  const totalMins = (h * 60 + m + duration * 60) % (24 * 60);
  const eh = Math.floor(totalMins / 60).toString().padStart(2, "0");
  const em = (totalMins % 60).toString().padStart(2, "0");
  return `${eh}:${em}`;
}

function buildShiftConfigs(site: Site) {
  const d = site.shiftDurationHours;
  return {
    shift1: {
      label: "Shift 1", short: "S1",
      time: `${site.shift1Start}–${makeShiftEnd(site.shift1Start, d)}`,
      bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", dot: "bg-blue-500", icon: Sun,
    },
    shift2: {
      label: "Shift 2", short: "S2",
      time: `${site.shift2Start}–${makeShiftEnd(site.shift2Start, d)}`,
      bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", dot: "bg-orange-500", icon: Sunset,
    },
    shift3: {
      label: "Shift 3", short: "S3",
      time: `${site.shift3Start}–${makeShiftEnd(site.shift3Start, d)}`,
      bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", dot: "bg-indigo-500", icon: Moon,
    },
    off: {
      label: "Day Off", short: "OFF",
      time: "Off",
      bg: "bg-red-50", text: "text-red-500", border: "border-red-200", dot: "bg-red-400", icon: AlertCircle,
    },
  } as const;
}

const SHIFT_CYCLE: ShiftCode[] = ["shift1", "shift2", "shift3", "off", ""];

const STORAGE_KEY = (companyId: number | string) => `ihr_rota_v2_${companyId}`;

const weekKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
const cellKey = (siteId: string, empId: number, date: Date) => `${siteId}_${empId}_${format(date, "yyyy-MM-dd")}`;
const dateStr = (date: Date) => format(date, "yyyy-MM-dd");

// ── Component ──────────────────────────────────────────────────────────────────
export default function HrRota() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: employees, isLoading } = useListEmployees({});
  const companyId = user?.companyId ?? 0;

  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [rota, setRota] = useState<RotaMap>({});
  const [publishedWeeks, setPublishedWeeks] = useState<Set<string>>(new Set());
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Sites
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string>("");
  const [showSiteManager, setShowSiteManager] = useState(false);
  const [newSite, setNewSite] = useState({ name: "", shiftDurationHours: 8, shift1Start: "06:00", shift2Start: "14:00", shift3Start: "22:00" });
  const [editingSite, setEditingSite] = useState<string | null>(null);

  // Per-employee allocated hours
  const [allocations, setAllocations] = useState<EmpAllocations>({});
  const [showAllocations, setShowAllocations] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(companyId));
      if (saved) {
        const parsed = JSON.parse(saved);
        setRota(parsed.rota ?? {});
        setPublishedWeeks(new Set(parsed.published ?? []));
        const loadedSites: Site[] = parsed.sites ?? [];
        setSites(loadedSites);
        setAllocations(parsed.allocations ?? {});
        if (loadedSites.length > 0) setActiveSiteId(loadedSites[0].id);
      }
    } catch {}
  }, [companyId]);

  const persist = useCallback((newRota: RotaMap, newPublished: Set<string>, newSites: Site[], newAllocs: EmpAllocations) => {
    try {
      localStorage.setItem(STORAGE_KEY(companyId), JSON.stringify({
        rota: newRota,
        published: Array.from(newPublished),
        sites: newSites,
        allocations: newAllocs,
      }));
    } catch {}
  }, [companyId]);

  const activeSite = sites.find(s => s.id === activeSiteId);
  const SHIFTS = activeSite ? buildShiftConfigs(activeSite) : null;

  // ── Site management ──────────────────────────────────────────────────────
  const addSite = () => {
    if (!newSite.name.trim()) { toast({ variant: "destructive", title: "Site name is required" }); return; }
    const id = `site_${Date.now()}`;
    const site: Site = { id, ...newSite };
    const updated = [...sites, site];
    setSites(updated);
    if (updated.length === 1) setActiveSiteId(id);
    persist(rota, publishedWeeks, updated, allocations);
    setNewSite({ name: "", shiftDurationHours: 8, shift1Start: "06:00", shift2Start: "14:00", shift3Start: "22:00" });
    toast({ title: `Site "${site.name}" added` });
  };

  const updateSite = (id: string, updates: Partial<Site>) => {
    const updated = sites.map(s => s.id === id ? { ...s, ...updates } : s);
    setSites(updated);
    persist(rota, publishedWeeks, updated, allocations);
  };

  const deleteSite = (id: string) => {
    const updated = sites.filter(s => s.id !== id);
    setSites(updated);
    if (activeSiteId === id) setActiveSiteId(updated[0]?.id ?? "");
    persist(rota, publishedWeeks, updated, allocations);
    toast({ title: "Site removed" });
  };

  // ── Allocations ─────────────────────────────────────────────────────────
  const setAllocation = (empId: number, hours: number) => {
    const updated = { ...allocations, [empId]: hours };
    setAllocations(updated);
    persist(rota, publishedWeeks, sites, updated);
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const MIN_DATE = subMonths(new Date(), 3);
  const MAX_DATE = addMonths(new Date(), 6);
  const canGoPrev = isBefore(MIN_DATE, currentWeekStart);
  const canGoNext = !isBefore(addWeeks(currentWeekStart, 1), MAX_DATE);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const wKey = weekKey(currentWeekStart);
  const isPublished = publishedWeeks.has(wKey);
  const isPast = isBefore(addDays(currentWeekStart, 6), new Date());

  // ── Employees ────────────────────────────────────────────────────────────
  const depts = Array.from(new Set((employees ?? []).map(e => e.department).filter(Boolean)));
  const filteredEmps = (employees ?? []).filter(e => {
    if (deptFilter !== "all" && e.department !== deptFilter) return false;
    if (search && !`${e.fullName} ${e.designation}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const DEMO_EMPS = [
    { id: 101, fullName: "Alice Johnson", designation: "Frontend Dev", department: "Engineering" },
    { id: 102, fullName: "Bob Patel", designation: "Backend Dev", department: "Engineering" },
    { id: 103, fullName: "Carol Smith", designation: "HR Manager", department: "Human Resources" },
    { id: 104, fullName: "David Kim", designation: "DevOps Engineer", department: "Engineering" },
  ];
  const displayEmps = filteredEmps.length > 0 || isLoading ? filteredEmps : DEMO_EMPS as any[];
  const isDemo = filteredEmps.length === 0 && !isLoading;

  // ── Shift operations ─────────────────────────────────────────────────────
  const setShift = (empId: number, date: Date, shift: ShiftCode) => {
    if (!activeSiteId) { toast({ variant: "destructive", title: "Select or create a site first" }); return; }
    const key = cellKey(activeSiteId, empId, date);
    const updated = { ...rota, [key]: shift };
    setRota(updated);
    setUnsavedChanges(true);
  };

  const getShift = (empId: number, date: Date): ShiftCode => {
    if (!activeSiteId) return "";
    return rota[cellKey(activeSiteId, empId, date)] ?? "";
  };

  // ── Auto-suggest for an employee ─────────────────────────────────────────
  const autoSuggest = (empId: number) => {
    if (!activeSite) return;
    const allocated = allocations[empId] ?? 40;
    const shiftsNeeded = Math.min(7, Math.round(allocated / activeSite.shiftDurationHours));
    const updated = { ...rota };

    // Clear existing week for this emp+site
    weekDays.forEach(d => { delete updated[cellKey(activeSiteId, empId, d)]; });

    // Prefer weekdays, then weekends
    const sorted = [...weekDays].sort((a, b) => {
      const aw = a.getDay() === 0 || a.getDay() === 6 ? 1 : 0;
      const bw = b.getDay() === 0 || b.getDay() === 6 ? 1 : 0;
      return aw - bw;
    });

    sorted.slice(0, shiftsNeeded).forEach(d => {
      updated[cellKey(activeSiteId, empId, d)] = "shift1";
    });
    sorted.slice(shiftsNeeded).forEach(d => {
      updated[cellKey(activeSiteId, empId, d)] = "off";
    });

    setRota(updated);
    setUnsavedChanges(true);
    toast({ title: `Auto-suggested ${shiftsNeeded} shifts for ${displayEmps.find((e: any) => e.id === empId)?.fullName}` });
  };

  const autoSuggestAll = () => {
    if (!activeSite) return;
    const updated = { ...rota };
    displayEmps.forEach((emp: any) => {
      const allocated = allocations[emp.id] ?? 40;
      const shiftsNeeded = Math.min(7, Math.round(allocated / activeSite.shiftDurationHours));
      weekDays.forEach(d => { delete updated[cellKey(activeSiteId, emp.id, d)]; });
      const sorted = [...weekDays].sort((a, b) => {
        const aw = a.getDay() === 0 || a.getDay() === 6 ? 1 : 0;
        const bw = b.getDay() === 0 || b.getDay() === 6 ? 1 : 0;
        return aw - bw;
      });
      sorted.slice(0, shiftsNeeded).forEach(d => {
        updated[cellKey(activeSiteId, emp.id, d)] = "shift1";
      });
      sorted.slice(shiftsNeeded).forEach(d => {
        updated[cellKey(activeSiteId, emp.id, d)] = "off";
      });
    });
    setRota(updated);
    setUnsavedChanges(true);
    toast({ title: "Auto-suggested shifts for all employees" });
  };

  // ── Copy/clear ────────────────────────────────────────────────────────────
  const copyPrevWeek = () => {
    const prevWeekStart = subWeeks(currentWeekStart, 1);
    const prevDays = Array.from({ length: 7 }, (_, i) => addDays(prevWeekStart, i));
    const updated = { ...rota };
    let copied = 0;
    (employees?.length ? employees : DEMO_EMPS).forEach(emp => {
      prevDays.forEach((prevDay, i) => {
        const prevKey = cellKey(activeSiteId, emp.id, prevDay);
        const currKey = cellKey(activeSiteId, emp.id, weekDays[i]);
        if (rota[prevKey]) { updated[currKey] = rota[prevKey]; copied++; }
      });
    });
    if (copied === 0) { toast({ title: "Previous week has no shifts to copy" }); }
    else { setRota(updated); setUnsavedChanges(true); toast({ title: `Copied ${copied} shifts` }); }
  };

  const clearWeek = () => {
    const updated = { ...rota };
    (employees?.length ? employees : DEMO_EMPS).forEach(emp => {
      weekDays.forEach(day => { delete updated[cellKey(activeSiteId, emp.id, day)]; });
    });
    setRota(updated); setUnsavedChanges(true); toast({ title: "Week cleared" });
  };

  // ── Save / Publish ────────────────────────────────────────────────────────
  const saveRota = (publish = false) => {
    const newPublished = new Set(publishedWeeks);
    if (publish) newPublished.add(wKey);
    persist(rota, newPublished, sites, allocations);
    setPublishedWeeks(newPublished);
    setUnsavedChanges(false);
    toast({ title: publish ? "Week published ✓" : "Rota saved ✓" });
  };

  // ── Weekly hours calc ─────────────────────────────────────────────────────
  const calcWeekHours = (empId: number) => {
    if (!activeSite) return 0;
    return weekDays.reduce((acc, day) => {
      const s = getShift(empId, day);
      return acc + (s && s !== "off" ? activeSite.shiftDurationHours : 0);
    }, 0);
  };

  // ── Shift Cell ────────────────────────────────────────────────────────────
  const ShiftCell = ({ empId, date }: { empId: number; date: Date }) => {
    const shift = getShift(empId, date);
    const cfg = SHIFTS && shift ? SHIFTS[shift as keyof typeof SHIFTS] : null;
    const todayDay = isToday(date);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all text-center px-1 gap-0.5",
              "hover:shadow-md hover:scale-[1.02] cursor-pointer",
              cfg ? `${cfg.bg} ${cfg.border}` : "bg-muted/20 border-dashed border-muted-foreground/20 hover:border-primary/40",
              todayDay && "ring-2 ring-primary/30",
            )}
          >
            {cfg ? (
              <>
                <span className={`text-[11px] font-bold ${cfg.text}`}>{cfg.short}</span>
                <span className={`text-[9px] ${cfg.text} opacity-80`}>{cfg.time.split("–")[0].trim()}</span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">—</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" side="bottom" align="center">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">{format(date, "EEE d MMM")}</p>
          {SHIFTS ? (
            <div className="space-y-1">
              {(["shift1", "shift2", "shift3", "off"] as const).map(code => {
                const s = SHIFTS[code];
                const Icon = s.icon;
                return (
                  <button key={code} onClick={() => setShift(empId, date, code)}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors",
                      shift === code ? `${s.bg} ${s.border} border` : "hover:bg-muted/50")}>
                    <Icon className={`h-3.5 w-3.5 ${s.text} shrink-0`} />
                    <div className="flex-1">
                      <span className={`text-xs font-semibold ${shift === code ? s.text : ""}`}>{s.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">{s.time}</span>
                    </div>
                    {shift === code && <CheckCircle2 className={`h-3 w-3 ${s.text}`} />}
                  </button>
                );
              })}
              {shift !== "" && (
                <button onClick={() => setShift(empId, date, "")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-muted/50">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Clear</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-1">No site selected</p>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  // ── Month Overview ────────────────────────────────────────────────────────
  const MonthOverview = () => {
    const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    const weeks: Date[][] = [];
    let week: Date[] = [];
    monthDays.forEach((d, i) => {
      if (i === 0) {
        const dow = (d.getDay() + 6) % 7;
        for (let p = 0; p < dow; p++) week.push(addDays(d, p - dow));
      }
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    });
    if (week.length > 0) {
      while (week.length < 7) week.push(addDays(week[week.length - 1], 1));
      weeks.push(week);
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            disabled={isBefore(startOfMonth(currentMonth), startOfMonth(MIN_DATE))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            disabled={!isBefore(startOfMonth(currentMonth), startOfMonth(MAX_DATE))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 border-r last:border-0">{d}</div>
            ))}
          </div>
          {weeks.map((wk, wi) => {
            const wkKey = weekKey(startOfWeek(wk[0], { weekStartsOn: 1 }));
            const published = publishedWeeks.has(wkKey);
            const isPastWk = isBefore(addDays(startOfWeek(wk[0], { weekStartsOn: 1 }), 6), new Date());
            let assigned = 0;
            const total = displayEmps.length * 7;
            displayEmps.forEach((emp: any) => { wk.forEach(d => { if (activeSiteId && rota[cellKey(activeSiteId, emp.id, d)]) assigned++; }); });
            const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;

            return (
              <div key={wi} className="grid grid-cols-7 border-t">
                {wk.map((d, di) => {
                  const inMonth = d.getMonth() === currentMonth.getMonth();
                  const isCurrentWeekDay = isSameWeek(d, currentWeekStart, { weekStartsOn: 1 });
                  const todayDay = isToday(d);
                  const dayAssigned = activeSiteId ? displayEmps.filter((emp: any) => rota[cellKey(activeSiteId, emp.id, d)]).length : 0;
                  return (
                    <div key={di} onClick={() => { setCurrentWeekStart(startOfWeek(d, { weekStartsOn: 1 })); setViewMode("week"); }}
                      className={cn("border-r last:border-0 p-2 min-h-[80px] cursor-pointer hover:bg-muted/30 transition-colors",
                        !inMonth && "opacity-30", isCurrentWeekDay && "bg-primary/5", todayDay && "ring-2 ring-inset ring-primary/40")}>
                      <div className="flex items-start justify-between mb-1.5">
                        <span className={cn("text-sm font-semibold", todayDay && "text-primary")}>{format(d, "d")}</span>
                        {di === 0 && (
                          <Badge variant={published ? "default" : isPastWk ? "secondary" : "outline"} className="text-[8px] px-1 h-4">
                            {published ? "✓" : isPastWk ? "Past" : `${pct}%`}
                          </Badge>
                        )}
                      </div>
                      {inMonth && dayAssigned > 0 && (
                        <div className="space-y-0.5">
                          {(["shift1","shift2","shift3"] as const).map(s => {
                            if (!SHIFTS) return null;
                            const cnt = displayEmps.filter((emp: any) => activeSiteId && rota[cellKey(activeSiteId, emp.id, d)] === s).length;
                            if (!cnt) return null;
                            return (
                              <div key={s} className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${SHIFTS[s].dot}`} />
                                <span className="text-[9px] text-muted-foreground">{cnt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Timeline bar ──────────────────────────────────────────────────────────
  const TimelineBar = () => {
    const months: Date[] = [];
    for (let i = -3; i <= 6; i++) months.push(addMonths(startOfMonth(new Date()), i));
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {months.map((m, i) => {
          const isCurrentM = m.getMonth() === currentWeekStart.getMonth() && m.getFullYear() === currentWeekStart.getFullYear();
          const isPastM = isBefore(endOfMonth(m), new Date());
          const isCurrViewM = m.getMonth() === currentMonth.getMonth() && m.getFullYear() === currentMonth.getFullYear();
          let publishedCnt = 0;
          const mDays = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) });
          const mWeeks = new Set(mDays.map(d => weekKey(startOfWeek(d, { weekStartsOn: 1 }))));
          mWeeks.forEach(wk => { if (publishedWeeks.has(wk)) publishedCnt++; });
          return (
            <button key={i} onClick={() => { setCurrentMonth(m); if (viewMode === "week") setCurrentWeekStart(startOfWeek(m, { weekStartsOn: 1 })); }}
              className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border text-center shrink-0 transition-all min-w-[64px]",
                isCurrentM || isCurrViewM ? "bg-primary text-primary-foreground border-primary" :
                isPastM ? "bg-muted/30 border-muted text-muted-foreground" : "bg-background border-border hover:border-primary/40")}>
              <span className="text-[10px] font-semibold uppercase tracking-wide">{format(m, "MMM")}</span>
              <span className="text-[9px] opacity-70">{format(m, "yy")}</span>
              {publishedCnt > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(publishedCnt, 5) }).map((_, j) => (
                    <div key={j} className="w-1 h-1 rounded-full bg-green-400 opacity-80" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rota Planner</h1>
            <p className="text-sm text-muted-foreground">Plan shifts by location · Set allocated hours per employee · Auto-suggest shifts</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isDemo && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1">
                <AlertCircle className="h-3 w-3" /> Demo mode
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAllocations(v => !v)} className="gap-1.5">
              <Clock className="h-4 w-4" /> Hours
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSiteManager(v => !v)} className="gap-1.5">
              <MapPin className="h-4 w-4" /> Manage Sites
            </Button>
            <div className="flex border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("week")}
                className={cn("h-9 px-3 flex items-center gap-1.5 text-xs transition-colors",
                  viewMode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <TableProperties className="h-4 w-4" /> Week
              </button>
              <button onClick={() => setViewMode("month")}
                className={cn("h-9 px-3 flex items-center gap-1.5 text-xs transition-colors",
                  viewMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <LayoutGrid className="h-4 w-4" /> Month
              </button>
            </div>
          </div>
        </div>

        {/* Site Manager Panel */}
        {showSiteManager && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Site / Location Manager</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSiteManager(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing sites */}
              {sites.length > 0 && (
                <div className="space-y-2">
                  {sites.map(site => (
                    <div key={site.id} className="border rounded-lg p-3">
                      {editingSite === site.id ? (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-1">
                              <Label className="text-xs">Site Name</Label>
                              <Input value={site.name} onChange={e => updateSite(site.id, { name: e.target.value })} className="h-8 mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Shift Duration (hrs)</Label>
                              <Select value={site.shiftDurationHours.toString()} onValueChange={v => updateSite(site.id, { shiftDurationHours: parseInt(v) })}>
                                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>{SHIFT_DURATION_OPTIONS.map(h => <SelectItem key={h} value={h.toString()}>{h}h</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Shift 1 Start</Label>
                              <Input type="time" value={site.shift1Start} onChange={e => updateSite(site.id, { shift1Start: e.target.value })} className="h-8 mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Shift 2 Start</Label>
                              <Input type="time" value={site.shift2Start} onChange={e => updateSite(site.id, { shift2Start: e.target.value })} className="h-8 mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Shift 3 Start</Label>
                              <Input type="time" value={site.shift3Start} onChange={e => updateSite(site.id, { shift3Start: e.target.value })} className="h-8 mt-1" />
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingSite(null)}>Done</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{site.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {site.shiftDurationHours}h shifts · S1 {site.shift1Start} · S2 {site.shift2Start} · S3 {site.shift3Start}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingSite(site.id)}><Settings className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteSite(site.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new site */}
              <div className="border-dashed border rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Add New Site</p>
                <div className="grid sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Site Name *</Label>
                    <Input placeholder="e.g. London Office" value={newSite.name} onChange={e => setNewSite(p => ({ ...p, name: e.target.value }))} className="h-8 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Shift Duration</Label>
                    <Select value={newSite.shiftDurationHours.toString()} onValueChange={v => setNewSite(p => ({ ...p, shiftDurationHours: parseInt(v) }))}>
                      <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{SHIFT_DURATION_OPTIONS.map(h => <SelectItem key={h} value={h.toString()}>{h}h</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Shift 1 Start</Label>
                    <Input type="time" value={newSite.shift1Start} onChange={e => setNewSite(p => ({ ...p, shift1Start: e.target.value }))} className="h-8 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Shift 2 Start</Label>
                    <Input type="time" value={newSite.shift2Start} onChange={e => setNewSite(p => ({ ...p, shift2Start: e.target.value }))} className="h-8 mt-1" />
                  </div>
                </div>
                <Button size="sm" onClick={addSite} className="h-8 text-xs gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Site</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Allocated Hours Panel */}
        {showAllocations && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Weekly Allocated Hours per Employee</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAllocations(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {displayEmps.map((emp: any) => (
                  <div key={emp.id} className="flex items-center gap-3 border rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {(emp.fullName ?? "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{emp.fullName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.designation || emp.department}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={168}
                        value={allocations[emp.id] ?? 40}
                        onChange={e => setAllocation(emp.id, parseInt(e.target.value) || 0)}
                        className="w-16 h-7 text-xs text-center"
                      />
                      <span className="text-xs text-muted-foreground">h/wk</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <TimelineBar />

        {/* Site Tabs */}
        {sites.length > 0 ? (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> Site:</span>
            {sites.map(site => (
              <button key={site.id} onClick={() => setActiveSiteId(site.id)}
                className={cn("px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                  activeSiteId === site.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40 text-muted-foreground")}>
                {site.name}
                {activeSiteId === site.id && activeSite && (
                  <span className="ml-1.5 opacity-70">· {activeSite.shiftDurationHours}h</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/20">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">No sites configured</p>
              <p className="text-xs text-muted-foreground">Click <strong>Manage Sites</strong> to add your first location.</p>
            </div>
            <Button size="sm" variant="outline" className="ml-auto shrink-0 gap-1" onClick={() => setShowSiteManager(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Site
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-44 text-sm" />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {depts.map(d => <SelectItem key={d!} value={d!}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            {activeSite && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50" onClick={autoSuggestAll}>
                <Wand2 className="h-3.5 w-3.5" /> Auto-Suggest All
              </Button>
            )}
          </div>
        </div>

        {viewMode === "month" ? (
          <MonthOverview />
        ) : (
          <>
            {/* Week navigator */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(w => subWeeks(w, 1))} disabled={!canGoPrev}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border min-w-[240px] justify-center">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{format(currentWeekStart, "d MMM")} – {format(addDays(currentWeekStart, 6), "d MMM yyyy")}</span>
                {isPublished && <Badge className="text-[10px] px-1.5 h-5 bg-green-500 hover:bg-green-500">Published</Badge>}
                {isPast && !isPublished && <Badge variant="secondary" className="text-[10px] px-1.5 h-5">Past</Badge>}
                {unsavedChanges && <div className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(w => addWeeks(w, 1))} disabled={!canGoNext}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={copyPrevWeek} disabled={!activeSiteId}><Copy className="h-3.5 w-3.5" /> Copy Prev</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={clearWeek} disabled={!activeSiteId}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => saveRota(false)} disabled={!unsavedChanges}><Save className="h-3.5 w-3.5" /> Save Draft</Button>
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => saveRota(true)}><CheckCircle2 className="h-3.5 w-3.5" /> {isPublished ? "Re-Publish" : "Publish"}</Button>
              </div>
            </div>

            {/* Rota Table */}
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-[200px] sticky left-0 bg-muted/40 z-10">Employee</th>
                      {weekDays.map(day => {
                        const todayDay = isToday(day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <th key={dateStr(day)} className={cn("text-center px-2 py-3 text-xs font-semibold min-w-[110px]",
                            isWeekend ? "text-rose-500" : "text-muted-foreground", todayDay && "text-primary")}>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-bold uppercase tracking-wide">{format(day, "EEE")}</span>
                              <span className={cn("text-base font-bold leading-none", todayDay && "text-primary")}>{format(day, "d")}</span>
                              <span className="text-[9px] opacity-60">{format(day, "MMM")}</span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground w-[100px]">Hrs / Alloc</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground w-[60px]">Auto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayEmps.map((emp: any, ri: number) => {
                      const hours = calcWeekHours(emp.id);
                      const allocated = allocations[emp.id] ?? 40;
                      const initials = (emp.fullName ?? "?").split(" ").slice(0, 2).map((n: string) => n[0]?.toUpperCase()).join("");
                      const overAllocated = hours > allocated;
                      return (
                        <tr key={emp.id} className={cn("hover:bg-muted/10 transition-colors", ri % 2 === 0 ? "bg-background" : "bg-muted/5")}>
                          <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 border-r">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{emp.fullName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{emp.designation || emp.department}</p>
                              </div>
                            </div>
                          </td>
                          {weekDays.map(day => {
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            return (
                              <td key={dateStr(day)} className={cn("px-1.5 py-2", isWeekend && "bg-rose-50/30")}>
                                <ShiftCell empId={emp.id} date={day} />
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn("text-xs font-bold", overAllocated ? "text-red-500" : hours > 0 ? "text-primary" : "text-muted-foreground")}>
                                {hours}h
                              </span>
                              <span className="text-[9px] text-muted-foreground">/ {allocated}h</span>
                              {activeSite && (
                                <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full transition-all", overAllocated ? "bg-red-400" : "bg-primary")}
                                    style={{ width: `${Math.min(100, (hours / allocated) * 100)}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {activeSite && (
                              <button onClick={() => autoSuggest(emp.id)}
                                className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto transition-colors"
                                title={`Auto-suggest shifts (${allocated}h / ${activeSite.shiftDurationHours}h = ${Math.round(allocated / activeSite.shiftDurationHours)} shifts)`}>
                                <Wand2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t-2">
                      <td className="px-4 py-2.5 sticky left-0 bg-muted/30 z-10 border-r">
                        <span className="text-xs font-semibold text-muted-foreground">Daily Total</span>
                      </td>
                      {weekDays.map(day => {
                        const dayCounts: Record<string, number> = {};
                        displayEmps.forEach((emp: any) => {
                          const s = getShift(emp.id, day);
                          if (s) dayCounts[s] = (dayCounts[s] ?? 0) + 1;
                        });
                        const total = Object.values(dayCounts).reduce((a, b) => a + b, 0);
                        return (
                          <td key={dateStr(day)} className="px-1.5 py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs font-bold">{total}</span>
                              <div className="flex gap-0.5">
                                {SHIFTS && Object.entries(dayCounts).map(([s, c]) => (
                                  <div key={s} className={`w-2 h-2 rounded-full ${(SHIFTS as any)[s]?.dot ?? "bg-muted"}`} title={`${(SHIFTS as any)[s]?.label}: ${c}`} />
                                ))}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs font-bold text-primary">
                          {activeSite ? displayEmps.reduce((acc: number, emp: any) => acc + calcWeekHours(emp.id), 0) : 0}h
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Legend */}
            {activeSite && SHIFTS && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Shift Legend — {activeSite.name} ({activeSite.shiftDurationHours}h shifts)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["shift1","shift2","shift3","off"] as const).map(code => {
                    const s = SHIFTS[code];
                    const Icon = s.icon;
                    return (
                      <div key={code} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${s.bg} border ${s.border}`}>
                        <Icon className={`h-4 w-4 ${s.text} shrink-0`} />
                        <div>
                          <p className={`text-xs font-semibold ${s.text}`}>{s.label}</p>
                          <p className="text-[10px] text-muted-foreground">{s.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
