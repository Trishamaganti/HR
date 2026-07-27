import { useState, useRef, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListAttendance, usePunchAttendance, getListAttendanceQueryKey, useListLeaves, getListLeavesQueryKey, useListEmployees, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogIn, LogOut, Loader2, Camera, MapPin, X, Calendar, ClipboardList, BarChart2, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmployeeAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  // Location state
  const [location, setLocation] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Punch state
  const [punchType, setPunchType] = useState<'punch_in' | 'punch_out' | null>(null);
  const [isPunching, setIsPunching] = useState(false);

  // Step 1: Load employees list (uses companyId, independent of empId)
  const empParams = { companyId: user?.companyId ?? undefined };
  const { data: employees } = useListEmployees(
    empParams,
    { query: { enabled: !!user?.companyId, queryKey: getListEmployeesQueryKey(empParams) } }
  );

  // Step 2: Resolve the correct numeric employee ID by matching on email
  const myEmployee = employees?.find(e => e.email === user?.email);
  const empId = myEmployee?.id ?? 0;

  // Step 3: Load attendance using the correct numeric employee ID
  const { data: attendance, isLoading } = useListAttendance(
    { employeeId: empId },
    { query: { enabled: !!empId, queryKey: getListAttendanceQueryKey({ employeeId: empId }) } }
  );

  const leaveParams = { employeeId: empId };
  const { data: leaves } = useListLeaves(
    leaveParams,
    { query: { enabled: !!empId, queryKey: getListLeavesQueryKey(leaveParams) } }
  );

  const punchMutation = usePunchAttendance();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = attendance?.find(a => a.date.startsWith(todayStr));
  const hasPunchedIn = !!todayRecord?.punchIn;
  const hasPunchedOut = !!todayRecord?.punchOut;

  // Camera helpers
  const openCamera = async (type: 'punch_in' | 'punch_out') => {
    setPunchType(type);
    setCapturedPhoto(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setStreamRef(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera. Proceeding without photo." });
      setCameraOpen(false);
      captureLocation(type);
    }
  };

  const closeCamera = useCallback(() => {
    streamRef?.getTracks().forEach(t => t.stop());
    setStreamRef(null);
    setCameraOpen(false);
    setPunchType(null);
  }, [streamRef]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCapturedPhoto(dataUrl);
    streamRef?.getTracks().forEach(t => t.stop());
    setStreamRef(null);
  };

  const retakePhoto = async () => {
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setStreamRef(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {}
  };

  const captureLocation = useCallback((type: 'punch_in' | 'punch_out') => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
        setLocation(loc);
        setLocLoading(false);
        doPunch(type, loc);
      },
      () => {
        setLocLoading(false);
        doPunch(type, "Location unavailable");
      },
      { timeout: 8000 }
    );
  }, []); // eslint-disable-line

  const confirmAndPunch = () => {
    if (!punchType) return;
    setCameraOpen(false);
    captureLocation(punchType);
  };

  const doPunch = (type: 'punch_in' | 'punch_out', loc: string) => {
    if (!empId) {
      toast({ variant: "destructive", title: "Error", description: "Could not resolve your employee profile. Please contact HR." });
      return;
    }
    setIsPunching(true);
    punchMutation.mutate({
      data: { employeeId: empId, type, location: loc }
    }, {
      onSuccess: () => {
        toast({
          title: `Punched ${type === 'punch_in' ? 'In' : 'Out'} ✓`,
          description: `Recorded at ${format(new Date(), 'HH:mm:ss')}${loc !== 'Location unavailable' ? ' · Location captured' : ''}`,
        });
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ employeeId: empId }) });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Punch Failed", description: err?.message || "Please try again." });
      },
      onSettled: () => setIsPunching(false)
    });
  };

  // Leave balance summary
  const approvedLeaves = leaves?.filter(l => l.status === 'approved') || [];
  const pendingLeaves = leaves?.filter(l => l.status === 'pending') || [];
  const leaveBalance = myEmployee?.leaveBalance ?? 20;

  // Weekly timesheet (current week)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Rota (simple weekly schedule placeholder)
  const rota = [
    { day: "Monday", shift: "09:00 – 18:00", type: "Office" },
    { day: "Tuesday", shift: "09:00 – 18:00", type: "Office" },
    { day: "Wednesday", shift: "09:00 – 18:00", type: "Remote" },
    { day: "Thursday", shift: "09:00 – 18:00", type: "Office" },
    { day: "Friday", shift: "09:00 – 17:00", type: "Office" },
    { day: "Saturday", shift: "Off", type: "Off" },
    { day: "Sunday", shift: "Off", type: "Off" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance & Time</h1>
          <p className="text-muted-foreground">Track your working hours, leaves, and schedule.</p>
        </div>

        {/* Leave balance quick cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">{leaveBalance}</div>
              <div className="text-xs text-muted-foreground mt-1">Leave Balance (days)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{approvedLeaves.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Leaves Taken</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-amber-500">{pendingLeaves.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">{attendance?.filter(a => a.status === 'present').length ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Days Present (all time)</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today"><Clock className="h-4 w-4 mr-2" />Today</TabsTrigger>
            <TabsTrigger value="timesheet"><BarChart2 className="h-4 w-4 mr-2" />Timesheet</TabsTrigger>
            <TabsTrigger value="history"><ClipboardList className="h-4 w-4 mr-2" />History</TabsTrigger>
            <TabsTrigger value="rota"><Calendar className="h-4 w-4 mr-2" />Rota</TabsTrigger>
          </TabsList>

          {/* TODAY TAB */}
          <TabsContent value="today" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Time Clock</CardTitle>
                  <CardDescription>{format(currentTime, 'EEEE, MMMM d, yyyy')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-6 space-y-6">
                  <div className="text-5xl font-mono tracking-wider font-bold tabular-nums">
                    {format(currentTime, 'HH:mm:ss')}
                  </div>

                  {capturedPhoto && (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow">
                      <img src={capturedPhoto} alt="Punch photo" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {location}
                    </div>
                  )}

                  <div className="flex gap-4 w-full max-w-sm">
                    <Button
                      className="flex-1 h-14 text-base"
                      disabled={isPunching || locLoading || hasPunchedIn || !empId}
                      onClick={() => openCamera('punch_in')}
                    >
                      {(isPunching || locLoading) && !hasPunchedIn
                        ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        : <LogIn className="mr-2 h-5 w-5" />}
                      Punch In
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-14 text-base"
                      disabled={isPunching || locLoading || !hasPunchedIn || hasPunchedOut || !empId}
                      onClick={() => openCamera('punch_out')}
                    >
                      {(isPunching || locLoading) && hasPunchedIn
                        ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        : <LogOut className="mr-2 h-5 w-5" />}
                      Punch Out
                    </Button>
                  </div>

                  {todayRecord && (
                    <div className="w-full text-center text-sm text-muted-foreground border-t pt-4 space-y-1">
                      {todayRecord.punchIn && <div>Punched In: <span className="font-medium text-foreground">{todayRecord.punchIn.slice(0, 8)}</span></div>}
                      {todayRecord.punchOut && <div>Punched Out: <span className="font-medium text-foreground">{todayRecord.punchOut.slice(0, 8)}</span></div>}
                      {todayRecord.location && todayRecord.location !== "Office Headquarters" && (
                        <div className="flex items-center justify-center gap-1"><MapPin className="h-3 w-3" />{todayRecord.location}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Today's Status</CardTitle></CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : todayRecord ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      <Badge variant={
                        todayRecord.status === 'present' ? 'default' :
                        todayRecord.status === 'late' ? 'secondary' : 'outline'
                      } className="text-lg px-6 py-2 capitalize">
                        {todayRecord.status.replace('_', ' ')}
                      </Badge>
                      {todayRecord.hoursWorked && (
                        <div className="text-xl font-medium">{todayRecord.hoursWorked} hrs worked</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
                      <Clock className="h-12 w-12 opacity-20" />
                      <p>No records for today yet.</p>
                      <p className="text-sm">Click Punch In to start your day.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TIMESHEET TAB */}
          <TabsContent value="timesheet" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Timesheet</CardTitle>
                <CardDescription>Week of {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Punch In</TableHead>
                      <TableHead>Punch Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekDays.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const rec = attendance?.find(a => a.date.startsWith(dayStr));
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isToday = dayStr === todayStr;
                      return (
                        <TableRow key={dayStr} className={isToday ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">{format(day, 'EEE')}{isToday && <span className="ml-2 text-xs text-primary">(Today)</span>}</TableCell>
                          <TableCell>{format(day, 'MMM d')}</TableCell>
                          <TableCell>{rec?.punchIn ? rec.punchIn.slice(0, 5) : isWeekend ? '—' : '-'}</TableCell>
                          <TableCell>{rec?.punchOut ? rec.punchOut.slice(0, 5) : isWeekend ? '—' : '-'}</TableCell>
                          <TableCell>{rec?.hoursWorked ? `${rec.hoursWorked}h` : isWeekend ? '—' : '-'}</TableCell>
                          <TableCell className="text-right">
                            {isWeekend ? (
                              <Badge variant="outline">Weekend</Badge>
                            ) : rec ? (
                              <Badge variant={rec.status === 'present' ? 'default' : rec.status === 'absent' ? 'destructive' : 'secondary'} className="capitalize">
                                {rec.status.replace('_', ' ')}
                              </Badge>
                            ) : day <= new Date() ? (
                              <Badge variant="destructive">Absent</Badge>
                            ) : (
                              <Badge variant="outline">Upcoming</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4 pt-4 border-t flex gap-6 text-sm text-muted-foreground">
                  <span>Total this week: <strong className="text-foreground">
                    {(weekDays.reduce((sum, day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const rec = attendance?.find(a => a.date.startsWith(dayStr));
                      return sum + (rec?.hoursWorked || 0);
                    }, 0)).toFixed(1)}h
                  </strong></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Attendance History</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !attendance || attendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No attendance records found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Punch In</TableHead>
                        <TableHead>Punch Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...attendance].sort((a, b) => b.date.localeCompare(a.date)).map(record => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{format(new Date(record.date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{record.punchIn ? record.punchIn.slice(0, 5) : '-'}</TableCell>
                          <TableCell>{record.punchOut ? record.punchOut.slice(0, 5) : '-'}</TableCell>
                          <TableCell>{record.hoursWorked || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                            {record.location && record.location !== "Office Headquarters" ? (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{record.location}</span>
                            ) : record.location || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'} className="capitalize">
                              {record.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ROTA TAB */}
          <TabsContent value="rota" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>My Rota</CardTitle>
                <CardDescription>Your weekly work schedule assigned by HR</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>Your rota is managed by your HR team. Contact them if you need changes.</AlertDescription>
                </Alert>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rota.map(r => {
                      const isToday = format(new Date(), 'EEEE') === r.day;
                      return (
                        <TableRow key={r.day} className={isToday ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">
                            {r.day}{isToday && <span className="ml-2 text-xs text-primary">(Today)</span>}
                          </TableCell>
                          <TableCell>{r.shift}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={r.type === 'Off' ? 'secondary' : r.type === 'Remote' ? 'outline' : 'default'}>
                              {r.type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Camera Dialog */}
        <Dialog open={cameraOpen} onOpenChange={(open) => { if (!open) closeCamera(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Selfie Verification — {punchType === 'punch_in' ? 'Punch In' : 'Punch Out'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                {!capturedPhoto ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-3">
                {!capturedPhoto ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={closeCamera}>
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button className="flex-1" onClick={takePhoto}>
                      <Camera className="mr-2 h-4 w-4" /> Take Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1" onClick={retakePhoto}>
                      Retake
                    </Button>
                    <Button className="flex-1" onClick={confirmAndPunch}>
                      <LogIn className="mr-2 h-4 w-4" /> Confirm & {punchType === 'punch_in' ? 'Punch In' : 'Punch Out'}
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                After confirming, your location will be captured automatically.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
