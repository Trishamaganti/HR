import { useRef, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useListApplications, useListAttendance, usePunchAttendance, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation as useWouterLocation } from "wouter";
import { getApiUrl } from "@/lib/api";
import {
  Bell, Briefcase, Building2, CheckCircle, Calendar,
  MapPin, Camera, StickyNote, LogIn, LogOut, Loader2,
  Clock, User, AlertCircle, ChevronRight, CameraOff, RefreshCw,
  ClipboardList, X, Crown, ArrowRightLeft,
} from "lucide-react";

const DEMO_NOTIFICATIONS = [
  { id: 1, type: "org", icon: Building2, color: "text-blue-500", bg: "bg-blue-50", title: "TxSprint Technologies", message: "Your onboarding documents have been verified.", time: "2 hours ago", unread: true },
  { id: 2, type: "hr", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50", title: "HR Update", message: "Please submit your updated bank details before Friday.", time: "Yesterday", unread: true },
  { id: 3, type: "request", icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", title: "Experience Letter Ready", message: "Your requested experience letter is ready for download.", time: "2 days ago", unread: false },
  { id: 4, type: "org", icon: Briefcase, color: "text-purple-500", bg: "bg-purple-50", title: "New Job Match", message: "CloudStack Solutions has a role matching your profile.", time: "3 days ago", unread: false },
  { id: 5, type: "hr", icon: Calendar, color: "text-rose-500", bg: "bg-rose-50", title: "Interview Scheduled", message: "Your interview with DataTech is confirmed for 28 May at 10:00 AM.", time: "4 days ago", unread: false },
  { id: 6, type: "request", icon: ClipboardList, color: "text-slate-500", bg: "bg-slate-50", title: "Leave Approved", message: "Your casual leave request for 10 May has been approved.", time: "5 days ago", unread: false },
];

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const BASE_URL = getApiUrl();
  const { data: candidate } = useQuery({
    queryKey: ["candidate-by-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const r = await fetch(`${BASE_URL}/candidates?userId=${user.id}`);
      const arr = await r.json();
      return (arr[0] ?? null) as any;
    },
    enabled: !!user?.id,
  });
  const { data: applications } = useListApplications({ candidateId: user?.id }, { query: { enabled: !!user?.id, queryKey: ["applications", user?.id] } });

  const empId = user?.employeeId ? parseInt(user.employeeId as string, 10) : null;
  const attParams = { employeeId: empId ?? undefined };
  const { data: attendance } = useListAttendance(attParams, { query: { enabled: !!empId, queryKey: getListAttendanceQueryKey(attParams) } });
  const punchMutation = usePunchAttendance();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRecord = attendance?.find(a => a.date.startsWith(todayStr));
  const hasPunchedIn = !!todayRecord?.punchIn;
  const hasPunchedOut = !!todayRecord?.punchOut;
  const isDemo = !empId;

  const [isPunching, setIsPunching] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(
    DEMO_NOTIFICATIONS.filter(n => user?.companyId || n.type !== "org")
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handlePunch = (type: "punch_in" | "punch_out") => {
    if (!empId) return;
    setIsPunching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => doPunch(type, `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
      () => doPunch(type, "Location unavailable"),
      { timeout: 6000 }
    );
  };

  const doPunch = (type: "punch_in" | "punch_out", loc: string) => {
    punchMutation.mutate({ data: { employeeId: empId!, type, location: loc } }, {
      onSuccess: () => {
        toast({ title: `Punched ${type === "punch_in" ? "In" : "Out"} ✓`, description: `Recorded at ${format(new Date(), "HH:mm:ss")}` });
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ employeeId: empId! }) });
      },
      onError: () => toast({ variant: "destructive", title: "Punch Failed" }),
      onSettled: () => setIsPunching(false),
    });
  };

  const getLocation = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        setLocLoading(false);
      },
      () => {
        setLocation({ lat: 51.5074, lng: -0.1278, label: "London, UK (demo)" });
        setLocLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast({ variant: "destructive", title: "Camera unavailable", description: "Allow camera access to use this feature." });
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setCapturedPhoto(canvas.toDataURL("image/jpeg"));
    stopCamera();
    toast({ title: "Photo captured" });
  };

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const saveNotes = () => {
    setNotesSaved(true);
    toast({ title: "Note saved" });
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, unread: false })));
  const dismissNotification = (id: number) => setNotifications(ns => ns.filter(n => n.id !== id));

  const punchStatus = () => {
    if (isDemo) return { label: "Demo Mode", color: "bg-amber-100 text-amber-700 border-amber-200" };
    if (hasPunchedOut) return { label: "Clocked Out", color: "bg-slate-100 text-slate-600 border-slate-200" };
    if (hasPunchedIn) return { label: "On Duty", color: "bg-green-100 text-green-700 border-green-200" };
    return { label: "Not Clocked In", color: "bg-red-100 text-red-700 border-red-200" };
  };

  const ps = punchStatus();
  const { hasWorkRole, switchToWork, workRoleLabel, workHomePath } = useViewMode();
  const [, navigate] = useWouterLocation();

  const orgName = user?.companyId ? (user?.companyName ?? null) : null;
  const showOrgSwitch = hasWorkRole && orgName;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Organisation Management Switch ── */}
        {showOrgSwitch && (
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">Organisation Management Access</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You have <strong>{workRoleLabel}</strong> access to <strong>{orgName}</strong>. Switch to manage the organisation.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                  onClick={() => {
                    switchToWork();
                    navigate(workHomePath);
                  }}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Switch to {workRoleLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Profile Summary Card ── */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardContent className="flex items-center gap-5 py-5">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
              {(candidate?.fullName || user?.fullName || "C").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{candidate?.fullName || user?.fullName || "Candidate"}</h2>
              <p className="text-sm text-muted-foreground truncate">{candidate?.headline || "Complete your profile to add a headline"}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {candidate?.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {candidate.location}
                  </span>
                )}
                {candidate?.skills?.slice(0, 3).map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge className={`border text-xs font-medium ${ps.color}`}>{ps.label}</Badge>
              <div className="text-xs text-muted-foreground text-right">
                <span className="font-medium">{applications?.length || 0}</span> applications
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Two Panel Layout ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── LEFT: Notifications Panel ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Notifications</h2>
                {unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs h-5 min-w-5 flex items-center justify-center rounded-full px-1.5">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <div key={n.id} className={`relative flex gap-3 p-3 rounded-xl border transition-colors ${n.unread ? "bg-card shadow-sm border-primary/20" : "bg-muted/20 border-border"}`}>
                    <div className={`w-8 h-8 rounded-full ${n.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${n.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{n.title}</p>
                        {n.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                    </div>
                    <button
                      onClick={() => dismissNotification(n.id)}
                      className="absolute top-2 right-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <Bell className="h-10 w-10 opacity-20 mb-3" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>

            {/* Recent Applications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> Recent Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {applications && applications.length > 0 ? (
                  applications.slice(0, 4).map(app => (
                    <div key={app.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{app.jobTitle}</p>
                        <p className="text-[10px] text-muted-foreground">{app.companyName}</p>
                      </div>
                      <Badge variant={app.status === "hired" || app.status === "offer" ? "default" : app.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] capitalize shrink-0 ml-2">
                        {app.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No applications yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Employment Status Panel ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Employment Status</h2>
            </div>

            {/* Punch In/Out */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
                  <Badge className={`border text-xs ${ps.color}`}>{ps.label}</Badge>
                </div>

                {isDemo ? (
                  <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                    📋 Demo mode — punch in/out is available once your employment is linked.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Punch In</p>
                      <p className="text-base font-bold text-green-600 mt-0.5">
                        {todayRecord?.punchIn ? format(new Date(todayRecord.punchIn), "HH:mm") : null || "—"}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Punch Out</p>
                      <p className="text-base font-bold text-rose-600 mt-0.5">
                        {todayRecord?.punchOut ? format(new Date(todayRecord.punchOut), "HH:mm") : null || "—"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={isPunching || hasPunchedIn || isDemo} onClick={() => handlePunch("punch_in")}>
                    {isPunching && !hasPunchedIn ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <LogIn className="mr-1.5 h-3.5 w-3.5" />}
                    Punch In
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled={isPunching || !hasPunchedIn || hasPunchedOut || isDemo} onClick={() => handlePunch("punch_out")}>
                    {isPunching && hasPunchedIn ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <LogOut className="mr-1.5 h-3.5 w-3.5" />}
                    Punch Out
                  </Button>
                </div>

                {/* Rota Today */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
                    const today = new Date().getDay();
                    const dayIdx = today === 0 ? 6 : today - 1;
                    const isToday = i === dayIdx;
                    const offDays = [5, 6];
                    return (
                      <div key={d} className={`text-center rounded p-1.5 text-[10px] border ${isToday ? "border-primary bg-primary/10 font-bold" : "bg-muted/20"}`}>
                        <span className={isToday ? "text-primary" : "text-muted-foreground"}>{d}</span>
                        <div className={`text-[9px] mt-0.5 font-medium ${offDays.includes(i) ? "text-red-500" : "text-green-600"}`}>
                          {offDays.includes(i) ? "OFF" : "09–18"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Live Location */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> My Location
                  </CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={getLocation} disabled={locLoading}>
                    {locLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {location ? "Refresh" : "Get Location"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {location ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-green-500" />
                      <span>{location.label}</span>
                    </div>
                    <div className="rounded-lg overflow-hidden border h-36">
                      <iframe
                        title="Location Map"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.02}%2C${location.lat - 0.015}%2C${location.lng + 0.02}%2C${location.lat + 0.015}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
                        className="w-full h-full"
                        style={{ border: "none" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-20 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <MapPin className="h-6 w-6 opacity-30" />
                    <p className="text-xs">Click "Get Location" to show your position</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" /> Quick Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <Textarea
                  placeholder="Add a note for today… tasks, reminders, meeting points…"
                  className="resize-none min-h-[80px] text-sm"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <Button size="sm" variant="secondary" className="w-full gap-1.5 h-8 text-xs" onClick={saveNotes} disabled={!notes.trim()}>
                  {notesSaved ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <StickyNote className="h-3.5 w-3.5" />}
                  {notesSaved ? "Saved!" : "Save Note"}
                </Button>
              </CardContent>
            </Card>

            {/* Camera */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" /> Quick Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {cameraActive ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-44 object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-1.5 h-8 text-xs" onClick={takePhoto}>
                        <Camera className="h-3.5 w-3.5" /> Capture
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={stopCamera}>
                        <CameraOff className="h-3.5 w-3.5" /> Stop
                      </Button>
                    </div>
                  </div>
                ) : capturedPhoto ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border">
                      <img src={capturedPhoto} alt="Captured" className="w-full max-h-44 object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => { setCapturedPhoto(null); startCamera(); }}>
                        <RefreshCw className="h-3.5 w-3.5" /> Retake
                      </Button>
                      <a href={capturedPhoto} download="photo.jpg">
                        <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs">
                          Save
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 gap-3">
                    <Camera className="h-8 w-8 text-muted-foreground/30" />
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={startCamera}>
                      <Camera className="h-3.5 w-3.5" /> Open Camera
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}
