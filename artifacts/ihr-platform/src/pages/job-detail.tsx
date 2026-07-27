import { useState, useEffect } from "react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { useGetJob, useCreateApplication } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, MapPin, DollarSign, Clock, Building, ArrowLeft, Send, CheckCircle2, Loader2, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function JobDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const { data: job, isLoading } = useGetJob(id, { query: { enabled: !!id, queryKey: [`job`, id] } });

  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  const createApplication = useCreateApplication();

  // Fetch candidate profile to pre-fill the form
  const { data: candidateProfile } = useQuery({
    queryKey: ["candidate-profile-by-user", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/candidates?userId=${user!.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return null;
      const list = await res.json();
      return list[0] ?? null;
    },
  });

  // Pre-fill form when profile or user data loads
  useEffect(() => {
    if (candidateProfile) {
      setFullName(candidateProfile.fullName ?? "");
      setEmail(candidateProfile.email ?? "");
      setPhone(candidateProfile.mobile ?? "");
      setCvUrl(candidateProfile.resumeUrl ?? "");
    } else if (user) {
      // Fallback: use auth user info if no candidate profile yet
      setEmail((user as any).email ?? "");
      setFullName((user as any).fullName ?? (user as any).name ?? "");
    }
  }, [candidateProfile, user]);

  // Auto-open the apply dialog if the user just returned from login
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("apply") === "1") {
        setApplyOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [user]);

  function handleApplyClick() {
    if (!user) {
      setLocation(`/login?redirect=/jobs/${id}?apply=1`);
      return;
    }
    setApplyOpen(true);
  }

  async function handleSubmitApplication() {
    if (!user || !job) return;
    if (!fullName.trim() || !email.trim()) {
      toast({ variant: "destructive", title: "Name and email are required." });
      return;
    }

    createApplication.mutate(
      {
        data: {
          jobId: job.id,
          candidateId: user.id,
          coverLetter: coverLetter || null,
          // Extra fields for candidate profile creation / update
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          cvUrl: cvUrl.trim() || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          setApplied(true);
          setApplyOpen(false);
          toast({
            title: "Application submitted!",
            description: "You can track it in My Applications.",
          });
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Failed to apply",
            description: err?.message ?? "Something went wrong. Please try again.",
          });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-4xl space-y-8">
          <Skeleton className="h-8 w-24 mb-8" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="space-y-4 pt-8 border-t">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!job) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-32 text-center">
          <h2 className="text-2xl font-bold mb-4">Job not found</h2>
          <Link href="/jobs"><Button variant="outline">Back to Jobs</Button></Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        <Link href="/jobs">
          <Button variant="ghost" className="mb-8 -ml-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to all jobs
          </Button>
        </Link>

        <div className="bg-card border rounded-2xl p-8 md:p-12 shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Building className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-semibold text-primary">{job.companyName || "Company"}</span>
              <span className="text-muted-foreground text-sm">•</span>
              <span className="text-muted-foreground text-sm">{job.department}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">{job.title}</h1>

            <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-medium mb-8">
              {job.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> {job.location}
                </div>
              )}
              {job.workMode && (
                <div className="flex items-center gap-2 capitalize">
                  <Briefcase className="h-5 w-5" /> {job.workMode}
                </div>
              )}
              <div className="flex items-center gap-2 capitalize">
                <Clock className="h-5 w-5" /> {job.employmentType.replace("_", " ")}
              </div>
              {(job.salaryMin || job.salaryMax) && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ""}
                  {job.salaryMin && job.salaryMax ? " - " : ""}
                  {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ""}
                </div>
              )}
            </div>

            {applied ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                Application Submitted —{" "}
                <Link href="/candidate/applications" className="underline underline-offset-2 hover:text-green-800">
                  track in My Applications
                </Link>
              </div>
            ) : (
              <Button size="lg" className="px-8 font-semibold" onClick={handleApplyClick}>
                Apply Now
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-4">About the Role</h3>
              <div className="prose prose-neutral max-w-none text-muted-foreground whitespace-pre-wrap">
                {job.description || "No description provided."}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <div className="rounded-xl border bg-muted/20 p-6">
              <h3 className="font-semibold mb-4 text-lg">Skills Required</h3>
              {job.skills && job.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not specified</p>
              )}
            </div>

            <div className="rounded-xl border bg-muted/20 p-6">
              <h3 className="font-semibold mb-4 text-lg">Job Details</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-medium capitalize">{job.experienceLevel || "Any"}</span>
                </li>
                <li className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Openings</span>
                  <span className="font-medium">{job.openings || 1}</span>
                </li>
                {job.deadline && (
                  <li className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-medium">{new Date(job.deadline).toLocaleDateString()}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for {job?.title}</DialogTitle>
            <DialogDescription>
              at {job?.companyName || "this company"} · {job?.location}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div>
              <Label htmlFor="apply-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apply-name"
                placeholder="Your full name"
                className="mt-1.5"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="apply-email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apply-email"
                type="email"
                placeholder="you@example.com"
                className="mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="apply-phone">
                Phone Number <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="apply-phone"
                type="tel"
                placeholder="+44 7700 000000"
                className="mt-1.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* CV URL */}
            <div>
              <Label htmlFor="apply-cv">
                CV / Resume Link <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="relative mt-1.5">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="apply-cv"
                  type="url"
                  placeholder="https://drive.google.com/… or LinkedIn URL"
                  className="pl-9"
                  value={cvUrl}
                  onChange={(e) => setCvUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Paste a link to your CV (Google Drive, Dropbox, LinkedIn, etc.)
              </p>
            </div>

            {/* Cover Letter */}
            <div>
              <Label htmlFor="apply-cover">
                Cover Letter <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="apply-cover"
                placeholder="Tell us why you're a great fit for this role…"
                className="mt-1.5 min-h-[100px] resize-none"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={createApplication.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmitApplication} disabled={createApplication.isPending}>
              {createApplication.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Submit Application</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
