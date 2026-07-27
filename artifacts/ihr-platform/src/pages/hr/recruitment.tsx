import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import {
  useListApplications,
  useUpdateApplicationStatus,
  useSendApplicationEmail,
  useUpdateApplicationLinks,
  useGenerateEmployeeFromApplication,
  getListApplicationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Mail, Video, Calendar, SlidersHorizontal, Brain,
  FileText, CheckCircle2, UserPlus, Trophy, XCircle, ArrowRight,
  Star, ChevronRight, Users, TrendingUp, LayoutGrid, List, Search
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const ALL_STAGES = [
  "applied", "ats_tracking", "screening", "shortlisted",
  "interview", "conditional_offer", "verification", "final_offer",
  "hired", "rejected",
] as const;

type Stage = typeof ALL_STAGES[number];

const STAGE_META: Record<Stage, {
  label: string;
  short: string;
  icon: React.ElementType;
  pill: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
  group: "pre" | "pipeline" | "end";
}> = {
  applied:          { label: "Applied",           short: "Applied",  icon: FileText,    pill: "bg-slate-100 border-slate-300 text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200", text: "text-slate-700",  dot: "bg-slate-400",  group: "pre" },
  ats_tracking:     { label: "ATS Review",        short: "ATS",      icon: Brain,       pill: "bg-violet-100 border-violet-300 text-violet-700", bg: "bg-violet-50",  border: "border-violet-200",text: "text-violet-700", dot: "bg-violet-500", group: "pre" },
  screening:        { label: "Screening",          short: "Screen",   icon: SlidersHorizontal, pill: "bg-blue-100 border-blue-300 text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",  text: "text-blue-700",  dot: "bg-blue-500",   group: "pre" },
  shortlisted:      { label: "Shortlisted",        short: "Short",    icon: Star,        pill: "bg-cyan-100 border-cyan-300 text-cyan-700",     bg: "bg-cyan-50",    border: "border-cyan-200",  text: "text-cyan-700",  dot: "bg-cyan-500",   group: "pre" },
  interview:        { label: "Interview",          short: "Interview",icon: Video,       pill: "bg-amber-100 border-amber-300 text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500",  group: "pipeline" },
  conditional_offer:{ label: "Conditional Offer",  short: "Cond Offer",icon: FileText,  pill: "bg-orange-100 border-orange-300 text-orange-700",bg: "bg-orange-50",  border: "border-orange-200",text: "text-orange-700",dot: "bg-orange-500", group: "pipeline" },
  verification:     { label: "Verification",       short: "Verify",   icon: CheckCircle2,pill: "bg-indigo-100 border-indigo-300 text-indigo-700",bg: "bg-indigo-50",  border: "border-indigo-200",text: "text-indigo-700",dot: "bg-indigo-500", group: "pipeline" },
  final_offer:      { label: "Final Offer",        short: "Final",    icon: Trophy,      pill: "bg-emerald-100 border-emerald-300 text-emerald-700",bg:"bg-emerald-50",border:"border-emerald-200",text:"text-emerald-700",dot:"bg-emerald-500",group:"pipeline"},
  hired:            { label: "Hired",              short: "Hired",    icon: UserPlus,    pill: "bg-green-100 border-green-300 text-green-700",  bg: "bg-green-50",   border: "border-green-200", text: "text-green-700", dot: "bg-green-500",  group: "end" },
  rejected:         { label: "Rejected",           short: "Rejected", icon: XCircle,     pill: "bg-red-100 border-red-300 text-red-700",       bg: "bg-red-50",     border: "border-red-200",   text: "text-red-700",   dot: "bg-red-400",    group: "end" },
};

const ROUND_COLORS: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 border-amber-300",
  2: "bg-orange-100 text-orange-700 border-orange-300",
  3: "bg-red-100 text-red-700 border-red-300",
};

export default function HrRecruitment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeStage, setActiveStage] = useState<Stage>("applied");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [emailApp, setEmailApp] = useState<any | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [meetingApp, setMeetingApp] = useState<any | null>(null);
  const [meetingPlatform, setMeetingPlatform] = useState("zoom");
  const [meetingUrl, setMeetingUrl] = useState("");

  const [calendarApp, setCalendarApp] = useState<any | null>(null);
  const [calendarUrl, setCalendarUrl] = useState("");

  const [offerApp, setOfferApp] = useState<any | null>(null);
  const [salaryOffer, setSalaryOffer] = useState("");
  const [offerNotes, setOfferNotes] = useState("");

  const [joiningApp, setJoiningApp] = useState<any | null>(null);
  const [joiningDate, setJoiningDate] = useState("");
  const [joiningNotes, setJoiningNotes] = useState("");

  const [generateApp, setGenerateApp] = useState<any | null>(null);

  const { data: applications, isLoading } = useListApplications(
    {},
    { query: { queryKey: getListApplicationsQueryKey() } }
  );

  const updateStatusMutation = useUpdateApplicationStatus();
  const sendEmailMutation = useSendApplicationEmail();
  const updateLinksMutation = useUpdateApplicationLinks();
  const generateEmployeeMutation = useGenerateEmployeeFromApplication();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });

  const uniqueRoles = Array.from(new Set(applications?.map(a => a.jobTitle).filter(Boolean) ?? [])) as string[];

  const filteredApps = (applications ?? []).filter(a => {
    if (roleFilter !== "all" && a.jobTitle !== roleFilter) return false;
    if (search && !`${a.candidateName} ${a.jobTitle}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stageCount = (s: Stage) => (applications ?? []).filter(a => a.status === s).length;
  const activeApps = filteredApps.filter(a => a.status === activeStage);

  const totalApps = (applications ?? []).length;
  const inPipeline = (applications ?? []).filter(a => ["interview","conditional_offer","verification","final_offer"].includes(a.status)).length;
  const hiredCount = stageCount("hired");
  const rejectedCount = stageCount("rejected");

  const handleStatusChange = (appId: number, newStatus: string, extra?: Record<string, unknown>) => {
    setUpdatingId(appId);
    updateStatusMutation.mutate(
      { id: appId, data: { status: newStatus, ...extra } as any },
      {
        onSuccess: () => { toast({ title: "Status updated" }); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
        onSettled: () => setUpdatingId(null),
      }
    );
  };

  const handleNextRound = (app: any) => {
    const nextRound = (app.interviewRound ?? 1) + 1;
    handleStatusChange(app.id, "interview", { interviewRound: nextRound });
  };

  const handleConditionalOffer = () => {
    if (!offerApp || !salaryOffer) return;
    setUpdatingId(offerApp.id);
    updateStatusMutation.mutate(
      { id: offerApp.id, data: { status: "conditional_offer", salaryOffer: parseInt(salaryOffer), offerNotes } as any },
      {
        onSuccess: () => { toast({ title: "Conditional offer sent" }); invalidate(); setOfferApp(null); setSalaryOffer(""); setOfferNotes(""); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
        onSettled: () => setUpdatingId(null),
      }
    );
  };

  const handleFinalOffer = () => {
    if (!joiningApp || !joiningDate) return;
    setUpdatingId(joiningApp.id);
    updateStatusMutation.mutate(
      { id: joiningApp.id, data: { status: "final_offer", joiningDate, offerNotes: joiningNotes } as any },
      {
        onSuccess: () => { toast({ title: "Final offer sent" }); invalidate(); setJoiningApp(null); setJoiningDate(""); setJoiningNotes(""); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
        onSettled: () => setUpdatingId(null),
      }
    );
  };

  const handleGenerateEmployee = (app: any) => {
    setGenerateApp(null);
    generateEmployeeMutation.mutate(
      { id: app.id },
      {
        onSuccess: (emp) => { toast({ title: "Employee record created!", description: `${emp.fullName} → ${emp.employeeCode}` }); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed to generate employee record" }),
      }
    );
  };

  const openEmailDialog = (app: any) => {
    setEmailApp(app);
    setEmailSubject(`Re: Your application for ${app.jobTitle}`);
    setEmailBody(`Dear ${app.candidateName},\n\nThank you for applying for the ${app.jobTitle} position.\n\nBest regards,\nHR Team`);
  };

  const handleSendEmail = () => {
    if (!emailApp) return;
    sendEmailMutation.mutate(
      { id: emailApp.id, data: { subject: emailSubject, body: emailBody } },
      {
        onSuccess: () => { toast({ title: "Email sent", description: `Sent to ${emailApp.candidateName}` }); setEmailApp(null); },
        onError: () => toast({ variant: "destructive", title: "Failed to send email" }),
      }
    );
  };

  const handleUpdateMeetingLink = () => {
    if (!meetingApp || !meetingUrl) return;
    updateLinksMutation.mutate(
      { id: meetingApp.id, data: { meetingLink: meetingUrl } },
      {
        onSuccess: () => { toast({ title: "Meeting link saved" }); invalidate(); setMeetingApp(null); setMeetingUrl(""); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      }
    );
  };

  const handleUpdateCalendarLink = () => {
    if (!calendarApp || !calendarUrl) return;
    updateLinksMutation.mutate(
      { id: calendarApp.id, data: { calendarLink: calendarUrl } },
      {
        onSuccess: () => { toast({ title: "Calendar link saved" }); invalidate(); setCalendarApp(null); setCalendarUrl(""); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      }
    );
  };

  const scoreColor = (score: number) =>
    score >= 85 ? "text-green-600 bg-green-100" : score >= 70 ? "text-primary bg-primary/10" : "text-orange-600 bg-orange-100";
  const scoreBg = (score: number) =>
    score >= 85 ? "bg-green-500" : score >= 70 ? "bg-primary" : "bg-orange-500";

  // ── Candidate Card ──────────────────────────────────────────────
  const CandidateCard = ({ app }: { app: any }) => {
    const stage = app.status as Stage;
    const isInterview = stage === "interview";
    const isConditional = stage === "conditional_offer";
    const isVerification = stage === "verification";
    const isFinalOffer = stage === "final_offer";
    const isHired = stage === "hired";
    const isRejected = stage === "rejected";
    const isAts = stage === "ats_tracking";
    const round = app.interviewRound ?? 1;
    const meta = STAGE_META[stage] ?? STAGE_META.applied;
    const isPre = !isInterview && !isConditional && !isVerification && !isFinalOffer && !isHired && !isRejected;

    const initials = (app.candidateName ?? "?")
      .split(" ").slice(0, 2).map((n: string) => n[0]?.toUpperCase() ?? "").join("");

    return (
      <Card className={`border ${meta.border} overflow-hidden hover:shadow-md transition-shadow`}>
        <CardContent className="p-0">
          {/* Card Header */}
          <div className={`px-4 py-3 ${meta.bg} border-b ${meta.border} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-full border-2 ${meta.border} flex items-center justify-center text-sm font-bold ${meta.text} bg-white shrink-0`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm leading-tight truncate">{app.candidateName}</h4>
                {isInterview && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${ROUND_COLORS[Math.min(round, 3)] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>
                    {round <= 3 ? `Round ${round}` : `R${round}`}
                  </span>
                )}
                {app.atsScore != null && isAts && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${scoreColor(app.atsScore)}`}>
                    {app.atsScore}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{app.jobTitle}</p>
            </div>
            {app.appliedAt && (
              <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                {new Date(app.appliedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>

          {/* Card Body */}
          <div className="px-4 py-3 space-y-3">
            {/* ATS score bar */}
            {isAts && app.atsScore != null && (
              <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-muted-foreground font-medium">ATS Match Score</span>
                  <span className={`font-bold ${app.atsScore >= 85 ? "text-green-600" : app.atsScore >= 70 ? "text-primary" : "text-orange-600"}`}>
                    {app.atsScore >= 85 ? "Strong" : app.atsScore >= 70 ? "Good" : "Partial"}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full transition-all ${scoreBg(app.atsScore)}`} style={{ width: `${app.atsScore}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Score: {app.atsScore}/100</span>
                  <span>Match: {app.matchPercent ?? app.atsScore}%</span>
                </div>
              </div>
            )}

            {/* Conditional offer details */}
            {isConditional && app.salaryOffer && (
              <div className="flex items-center gap-3 p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <div className="text-[10px] text-muted-foreground">Salary Offered</div>
                  <div className="text-base font-bold text-orange-700">${app.salaryOffer.toLocaleString()}/yr</div>
                </div>
                {app.offerNotes && <p className="text-[11px] text-muted-foreground flex-1 line-clamp-2">{app.offerNotes}</p>}
              </div>
            )}

            {/* Final offer details */}
            {isFinalOffer && (
              <div className="grid grid-cols-2 gap-2">
                {app.salaryOffer && (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-[10px] text-muted-foreground">Salary</div>
                    <div className="text-sm font-bold text-emerald-700">${app.salaryOffer.toLocaleString()}/yr</div>
                  </div>
                )}
                {app.joiningDate && (
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-[10px] text-muted-foreground">Joining Date</div>
                    <div className="text-xs font-semibold text-blue-700">{app.joiningDate}</div>
                  </div>
                )}
              </div>
            )}

            {/* Interview links */}
            {isInterview && (app.meetingLink || app.calendarLink) && (
              <div className="flex gap-2 flex-wrap">
                {app.meetingLink && (
                  <a href={app.meetingLink} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer gap-1">
                      <Video className="h-3 w-3" /> Meeting Link
                    </Badge>
                  </a>
                )}
                {app.calendarLink && (
                  <a href={app.calendarLink} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="text-xs border-green-200 text-green-600 hover:bg-green-50 cursor-pointer gap-1">
                      <Calendar className="h-3 w-3" /> Calendar
                    </Badge>
                  </a>
                )}
              </div>
            )}

            {/* Hired info */}
            {isHired && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <Trophy className="h-4 w-4 text-green-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-green-700">Hired</span>
                  {app.joiningDate && <span className="text-muted-foreground ml-1.5">· Joined: {app.joiningDate}</span>}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-1 border-t space-y-2">
              {/* Common: Email button */}
              {!isHired && !isRejected && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-primary" onClick={() => openEmailDialog(app)}>
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Button>
                  {isInterview && (
                    <>
                      <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-blue-600" onClick={() => { setMeetingApp(app); setMeetingUrl(app.meetingLink ?? ""); }}>
                        <Video className="h-3.5 w-3.5" /> Meeting
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-green-600" onClick={() => { setCalendarApp(app); setCalendarUrl(app.calendarLink ?? ""); }}>
                        <Calendar className="h-3.5 w-3.5" /> Slots
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Interview actions */}
              {isInterview && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 text-xs border-amber-300 hover:bg-amber-50 text-amber-700 col-span-2" disabled={updatingId === app.id} onClick={() => handleNextRound(app)}>
                    {updatingId === app.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
                    Next Round (R{round + 1})
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-orange-500 hover:bg-orange-600" disabled={updatingId === app.id} onClick={() => { setOfferApp(app); setSalaryOffer(app.salaryOffer?.toString() ?? ""); setOfferNotes(app.offerNotes ?? ""); }}>
                    <FileText className="mr-1 h-3 w-3" /> Cond. Offer
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-red-200 hover:bg-red-50 text-red-600" disabled={updatingId === app.id} onClick={() => handleStatusChange(app.id, "rejected")}>
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                </div>
              )}

              {/* Conditional offer actions */}
              {isConditional && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 col-span-2" disabled={updatingId === app.id} onClick={() => handleStatusChange(app.id, "verification")}>
                    {updatingId === app.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                    Offer Accepted → Verification
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setOfferApp(app); setSalaryOffer(app.salaryOffer?.toString() ?? ""); setOfferNotes(app.offerNotes ?? ""); }}>
                    Edit Offer
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-red-200 hover:bg-red-50 text-red-600" disabled={updatingId === app.id} onClick={() => handleStatusChange(app.id, "rejected")}>
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                </div>
              )}

              {/* Verification actions */}
              {isVerification && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 col-span-2" disabled={updatingId === app.id} onClick={() => { setJoiningApp(app); setJoiningDate(app.joiningDate ?? ""); setJoiningNotes(app.offerNotes ?? ""); }}>
                    {updatingId === app.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                    Verified → Send Final Offer
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-red-200 hover:bg-red-50 text-red-600 col-span-2" disabled={updatingId === app.id} onClick={() => handleStatusChange(app.id, "rejected")}>
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                </div>
              )}

              {/* Final offer actions */}
              {isFinalOffer && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 col-span-2" disabled={generateEmployeeMutation.isPending} onClick={() => setGenerateApp(app)}>
                    {generateEmployeeMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <UserPlus className="mr-1 h-3 w-3" />}
                    Generate Employee Record
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setJoiningApp(app); setJoiningDate(app.joiningDate ?? ""); setJoiningNotes(app.offerNotes ?? ""); }}>
                    Edit Joining Date
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-red-200 hover:bg-red-50 text-red-600" disabled={updatingId === app.id} onClick={() => handleStatusChange(app.id, "rejected")}>
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                </div>
              )}

              {/* Pre-pipeline: stage move dropdown */}
              {isPre && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Move to:</span>
                  <div className="flex-1">
                    {updatingId === app.id ? (
                      <div className="h-8 flex items-center justify-center border rounded bg-muted/50">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Select value={app.status} onValueChange={val => handleStatusChange(app.id, val)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ALL_STAGES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{STAGE_META[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // List row view
  const CandidateRow = ({ app }: { app: any }) => {
    const stage = app.status as Stage;
    const meta = STAGE_META[stage] ?? STAGE_META.applied;
    const initials = (app.candidateName ?? "?")
      .split(" ").slice(0, 2).map((n: string) => n[0]?.toUpperCase() ?? "").join("");
    return (
      <div className="flex items-center gap-4 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${meta.bg} ${meta.text} border ${meta.border} shrink-0`}>{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{app.candidateName}</p>
          <p className="text-xs text-muted-foreground truncate">{app.jobTitle}</p>
        </div>
        {app.atsScore != null && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${scoreColor(app.atsScore)}`}>{app.atsScore}%</span>}
        {app.appliedAt && <span className="text-xs text-muted-foreground shrink-0 hidden md:block">{new Date(app.appliedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span>}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => openEmailDialog(app)}><Mail className="h-3.5 w-3.5" /></Button>
          <div className="w-[130px]">
            {updatingId === app.id ? (
              <div className="h-7 flex items-center justify-center border rounded bg-muted/50"><Loader2 className="h-3 w-3 animate-spin" /></div>
            ) : (
              <Select value={app.status} onValueChange={val => handleStatusChange(app.id, val)}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{STAGE_META[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
    );
  };

  const meta = STAGE_META[activeStage];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recruitment Pipeline</h1>
            <p className="text-muted-foreground text-sm">Click a stage below to view and manage candidates</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search candidate…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 w-44 text-sm"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("grid")} className={`h-9 w-9 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`h-9 w-9 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Applications", value: totalApps, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "In Pipeline", value: inPipeline, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100" },
            { label: "Hired", value: hiredCount, icon: Trophy, color: "text-green-600", bg: "bg-green-100" },
            { label: "Rejected", value: rejectedCount, icon: XCircle, color: "text-red-500", bg: "bg-red-100" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className={`w-9 h-9 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Pipeline Stage Stepper ── */}
        {isLoading ? (
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {ALL_STAGES.map(s => <Skeleton key={s} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Group labels */}
            <div>
              <div className="flex text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 gap-1">
                <span className="flex-[4] pl-1">Pre-Screening</span>
                <span className="flex-[4] pl-1">Active Pipeline</span>
                <span className="flex-[2] pl-1">Outcomes</span>
              </div>
              <div className="flex gap-1">
                {ALL_STAGES.map((s, idx) => {
                  const m = STAGE_META[s];
                  const count = stageCount(s);
                  const isActive = s === activeStage;
                  const Icon = m.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => setActiveStage(s)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-center cursor-pointer
                        ${isActive
                          ? `${m.border} ${m.bg} shadow-md scale-[1.04]`
                          : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
                        }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? m.text : "text-muted-foreground"}`} />
                      <span className={`text-[10px] font-semibold leading-tight hidden sm:block ${isActive ? m.text : "text-muted-foreground"}`}>
                        {m.short}
                      </span>
                      <span className={`text-sm font-bold ${isActive ? m.text : "text-foreground"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="flex mt-2 rounded-full overflow-hidden h-1.5 gap-0.5">
                {ALL_STAGES.map(s => {
                  const count = stageCount(s);
                  const pct = totalApps > 0 ? (count / totalApps) * 100 : 0;
                  const m = STAGE_META[s];
                  return (
                    <div
                      key={s}
                      className={`${m.dot} transition-all rounded-full`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                      title={`${m.label}: ${count}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Active Stage Panel ── */}
            <div className={`rounded-2xl border-2 ${meta.border} ${meta.bg} p-4 space-y-4`}>
              {/* Stage header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border ${meta.border} flex items-center justify-center bg-white`}>
                    {(() => { const Icon = meta.icon; return <Icon className={`h-5 w-5 ${meta.text}`} />; })()}
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${meta.text}`}>{meta.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {activeApps.length} candidate{activeApps.length !== 1 ? "s" : ""}
                      {search || roleFilter !== "all" ? " (filtered)" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {activeStage !== ALL_STAGES[0] && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setActiveStage(ALL_STAGES[ALL_STAGES.indexOf(activeStage) - 1])}>
                      ← Prev
                    </Button>
                  )}
                  {activeStage !== ALL_STAGES[ALL_STAGES.length - 1] && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setActiveStage(ALL_STAGES[ALL_STAGES.indexOf(activeStage) + 1])}>
                      Next →
                    </Button>
                  )}
                </div>
              </div>

              {/* Candidate grid / list */}
              {activeApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  {(() => { const Icon = meta.icon; return <Icon className={`h-12 w-12 ${meta.text} opacity-20`} />; })()}
                  <p className="text-sm font-medium">No candidates in {meta.label}</p>
                  <p className="text-xs">Move candidates here from other stages using the dropdown in their card.</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeApps.map(app => <CandidateCard key={app.id} app={app} />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeApps.map(app => <CandidateRow key={app.id} app={app} />)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Dialogs (unchanged) ── */}

      {/* Conditional Offer Dialog */}
      <Dialog open={!!offerApp} onOpenChange={o => !o && setOfferApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-orange-600" /> Issue Conditional Offer</DialogTitle>
            <DialogDescription>Generate a conditional offer with salary details for <strong>{offerApp?.candidateName}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs text-muted-foreground">Offered Annual Salary ($)</Label><Input type="number" value={salaryOffer} onChange={e => setSalaryOffer(e.target.value)} placeholder="e.g. 75000" className="mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Offer Notes (optional)</Label><Textarea value={offerNotes} onChange={e => setOfferNotes(e.target.value)} placeholder="e.g. Benefits, probation period..." rows={3} className="mt-1 text-sm" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOfferApp(null)}>Cancel</Button>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleConditionalOffer} disabled={!salaryOffer || updateStatusMutation.isPending}>
                {updateStatusMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Issue Conditional Offer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Offer Dialog */}
      <Dialog open={!!joiningApp} onOpenChange={o => !o && setJoiningApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-emerald-600" /> Send Final Offer</DialogTitle>
            <DialogDescription>Set the joining date and send the final offer to <strong>{joiningApp?.candidateName}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {joiningApp?.salaryOffer && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="text-xs text-muted-foreground">Confirmed Salary</div>
                <div className="text-lg font-bold text-emerald-700">${joiningApp.salaryOffer.toLocaleString()}/yr</div>
              </div>
            )}
            <div><Label className="text-xs text-muted-foreground">Date of Joining (DOJ)</Label><Input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Final Offer Notes</Label><Textarea value={joiningNotes} onChange={e => setJoiningNotes(e.target.value)} rows={3} className="mt-1 text-sm" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setJoiningApp(null)}>Cancel</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleFinalOffer} disabled={!joiningDate || updateStatusMutation.isPending}>
                {updateStatusMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Send Final Offer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Employee Dialog */}
      <Dialog open={!!generateApp} onOpenChange={o => !o && setGenerateApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-green-600" /> Generate Employee Record</DialogTitle>
            <DialogDescription>This will create an official employee record for <strong>{generateApp?.candidateName}</strong> and mark them as Hired.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {generateApp && (
              <div className="bg-muted/40 rounded-lg p-4 text-sm grid grid-cols-2 gap-2">
                <div><span className="text-xs text-muted-foreground block">Name</span><p className="font-medium">{generateApp.candidateName}</p></div>
                <div><span className="text-xs text-muted-foreground block">Position</span><p className="font-medium">{generateApp.jobTitle}</p></div>
                <div><span className="text-xs text-muted-foreground block">Salary</span><p className="font-medium">{generateApp.salaryOffer ? `$${generateApp.salaryOffer.toLocaleString()}/yr` : "Not set"}</p></div>
                <div><span className="text-xs text-muted-foreground block">Joining Date</span><p className="font-medium">{generateApp.joiningDate || "Today"}</p></div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setGenerateApp(null)}>Cancel</Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => generateApp && handleGenerateEmployee(generateApp)} disabled={generateEmployeeMutation.isPending}>
                {generateEmployeeMutation.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <UserPlus className="mr-1.5 h-3 w-3" />} Confirm & Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={!!emailApp} onOpenChange={o => !o && setEmailApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email {emailApp?.candidateName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs text-muted-foreground">To</Label><Input value={emailApp?.candidateEmail || emailApp?.candidateName || ""} disabled className="mt-1 h-8 text-sm bg-muted/40" /></div>
            <div><Label className="text-xs text-muted-foreground">Subject</Label><Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="mt-1 h-8 text-sm" /></div>
            <div><Label className="text-xs text-muted-foreground">Message</Label><Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} className="mt-1 text-sm" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEmailApp(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSendEmail} disabled={sendEmailMutation.isPending || !emailSubject || !emailBody}>
                {sendEmailMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Link Dialog */}
      <Dialog open={!!meetingApp} onOpenChange={o => !o && setMeetingApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Video className="h-4 w-4 text-blue-600" /> Share Meeting Link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share a video call link with <strong>{meetingApp?.candidateName}</strong>.</p>
            <div>
              <Label className="text-xs text-muted-foreground">Platform</Label>
              <Select value={meetingPlatform} onValueChange={setMeetingPlatform}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">🎥 Zoom</SelectItem>
                  <SelectItem value="gmeet">📹 Google Meet</SelectItem>
                  <SelectItem value="teams">💼 Microsoft Teams</SelectItem>
                  <SelectItem value="other">🔗 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-muted-foreground">Meeting URL</Label><Input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://zoom.us/j/..." className="mt-1 h-9 text-sm" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setMeetingApp(null)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdateMeetingLink} disabled={updateLinksMutation.isPending || !meetingUrl}>
                {updateLinksMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Save & Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Link Dialog */}
      <Dialog open={!!calendarApp} onOpenChange={o => !o && setCalendarApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-green-600" /> Share Calendar Availability</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share a booking link with <strong>{calendarApp?.candidateName}</strong>.</p>
            <div><Label className="text-xs text-muted-foreground">Booking URL</Label><Input value={calendarUrl} onChange={e => setCalendarUrl(e.target.value)} placeholder="https://calendly.com/..." className="mt-1 h-9 text-sm" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCalendarApp(null)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdateCalendarLink} disabled={updateLinksMutation.isPending || !calendarUrl}>
                {updateLinksMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Save & Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
