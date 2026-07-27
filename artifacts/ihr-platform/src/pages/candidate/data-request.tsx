import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import {
  Building2, CheckCircle2, Clock, Loader2, Send,
  AlertCircle, ChevronRight,
} from "lucide-react";

const API = getApiUrl();

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  dateOfBirth: "Date of Birth",
  gender: "Gender",
  maritalStatus: "Marital Status",
  mobile: "Mobile Number",
  personalEmail: "Personal Email",
  fathersName: "Father's Name",
  mothersName: "Mother's Name",
  currentAddress: "Current Address",
  homeAddress: "Permanent / Home Address",
  education: "Education Details",
  experience: "Years of Experience",
  emergencyContacts: "Emergency Contacts",
  bankName: "Bank Name",
  bankAccountName: "Account Holder Name",
  bankAccountNumber: "Bank Account Number",
  bankIfscCode: "IFSC Code",
  bankBranchName: "Branch Name",
  refereeName: "Referee Name",
  refereePhone: "Referee Phone",
  refereeEmail: "Referee Email",
  resumeUrl: "Resume / CV",
  skills: "Skills",
};

interface DataRequest {
  id: number;
  token: string;
  type: string;
  status: string;
  requestedFields: string[];
  message: string | null;
  company: { id: number; name: string } | null;
  candidate: Record<string, unknown> | null;
  createdAt: string;
}

function getFieldValue(candidate: Record<string, unknown> | null, key: string): string {
  if (!candidate) return "";
  const val = candidate[key];
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function isMissing(candidate: Record<string, unknown> | null, key: string): boolean {
  if (!candidate) return true;
  const val = candidate[key];
  return val === null || val === undefined || val === "";
}

export default function CandidateDataRequest() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DataRequest | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      try {
        const candidateRes = await fetch(`${API}/candidates/${user.id}`);
        if (!candidateRes.ok) { setLoading(false); return; }
        const candidateData = await candidateRes.json();
        const res = await fetch(`${API}/onboarding-requests?candidateId=${candidateData.id}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setRequests(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const openRequest = async (req: DataRequest) => {
    const res = await fetch(`${API}/onboarding-requests/${req.token}`);
    if (!res.ok) return;
    const full = await res.json();
    setSelected(full);
    const initial: Record<string, string> = {};
    for (const key of full.requestedFields) {
      initial[key] = getFieldValue(full.candidate, key);
    }
    setFormValues(initial);
  };

  const handleShare = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const sharedData: Record<string, string> = {};
      for (const key of selected.requestedFields) {
        sharedData[key] = formValues[key] ?? "";
      }
      await fetch(`${API}/onboarding-requests/${selected.token}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", sharedData }),
      });
      setDone(selected.id);
      setRequests((prev) => prev.map((r) => r.id === selected.id ? { ...r, status: "completed" } : r));
      setSelected(null);
      toast({ title: "Details shared!", description: "Your information has been sent to the employer." });
    } catch {
      toast({ variant: "destructive", title: "Failed to share details" });
    } finally {
      setSubmitting(false);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const completed = requests.filter((r) => r.status === "completed");

  if (selected) {
    const missingFields = selected.requestedFields.filter((k) => isMissing(selected.candidate, k));
    const hasMissing = missingFields.length > 0;

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
            >
              ← Back to requests
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Data Request</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {selected.company?.name} has requested access to the following details.
            </p>
          </div>

          {selected.message && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-sm">{selected.message}</CardContent>
            </Card>
          )}

          {hasMissing && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{missingFields.length} field{missingFields.length > 1 ? "s are" : " is"} missing</strong> in your profile.
                Please fill them in before sharing.
              </span>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Requested Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected.requestedFields.map((key) => {
                const missing = isMissing(selected.candidate, key);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`field-${key}`} className="text-sm font-medium">
                        {FIELD_LABELS[key] ?? key}
                      </Label>
                      {missing && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          Missing
                        </Badge>
                      )}
                      {!missing && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Filled
                        </Badge>
                      )}
                    </div>
                    <Input
                      id={`field-${key}`}
                      value={formValues[key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`Enter your ${FIELD_LABELS[key] ?? key}...`}
                      className={missing && !formValues[key] ? "border-amber-300 focus:border-amber-400" : ""}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={handleShare} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Share My Details
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Employers have requested access to your profile details for onboarding.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              No data requests yet. When an employer requests your profile details, they'll appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending ({pending.length})
                </h2>
                {pending.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => openRequest(req)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-left"
                  >
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{req.company?.name ?? "A company"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Requesting {req.requestedFields.length} profile field{req.requestedFields.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Completed ({completed.length})
                </h2>
                {completed.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30"
                  >
                    <div className="p-2.5 rounded-lg bg-green-50">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{req.company?.name ?? "A company"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {req.requestedFields.length} field{req.requestedFields.length !== 1 ? "s" : ""} shared
                      </div>
                    </div>
                    <Badge className="bg-green-50 text-green-700 border-green-200 border text-xs shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Shared
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
