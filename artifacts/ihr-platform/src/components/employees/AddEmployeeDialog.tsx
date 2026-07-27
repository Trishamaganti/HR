import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail, Users, UserPlus, ChevronRight, CheckCircle2,
  Loader2, ChevronLeft, Search, ArrowRight,
} from "lucide-react";
import { getApiUrl } from "@/lib/api";

const API = getApiUrl();

const FIELD_GROUPS = [
  {
    group: "Personal Information",
    fields: [
      { key: "fullName", label: "Full Name" },
      { key: "dateOfBirth", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "maritalStatus", label: "Marital Status" },
      { key: "mobile", label: "Mobile Number" },
      { key: "personalEmail", label: "Personal Email" },
      { key: "fathersName", label: "Father's Name" },
      { key: "mothersName", label: "Mother's Name" },
    ],
  },
  {
    group: "Address Details",
    fields: [
      { key: "currentAddress", label: "Current Address" },
      { key: "homeAddress", label: "Permanent / Home Address" },
    ],
  },
  {
    group: "Education & Experience",
    fields: [
      { key: "education", label: "Education Details" },
      { key: "experience", label: "Years of Experience" },
    ],
  },
  {
    group: "Emergency Contact",
    fields: [{ key: "emergencyContacts", label: "Emergency Contacts" }],
  },
  {
    group: "Bank Details",
    fields: [
      { key: "bankName", label: "Bank Name" },
      { key: "bankAccountName", label: "Account Holder Name" },
      { key: "bankAccountNumber", label: "Bank Account Number" },
      { key: "bankIfscCode", label: "IFSC Code" },
      { key: "bankBranchName", label: "Branch Name" },
    ],
  },
  {
    group: "Reference",
    fields: [
      { key: "refereeName", label: "Referee Name" },
      { key: "refereePhone", label: "Referee Phone" },
      { key: "refereeEmail", label: "Referee Email" },
    ],
  },
  {
    group: "Documents",
    fields: [{ key: "resumeUrl", label: "Resume / CV" }],
  },
];

const ALL_FIELD_KEYS = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

const STATUS_LABELS: Record<string, string> = {
  offer: "Offer Extended",
  conditional_offer: "Conditional Offer",
  verification: "Verification",
  final_offer: "Final Offer",
  hired: "Hired",
};

type Step = "method" | "external-form" | "candidate-pick" | "fields" | "done";

interface CandidateWithOffer {
  id: number;
  fullName: string;
  email: string;
  mobile: string | null;
  headline: string | null;
  avatarUrl: string | null;
  applicationStatus: string | null;
  salaryOffer: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddEmployeeDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("method");
  const [loading, setLoading] = useState(false);

  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [message, setMessage] = useState("");

  const [candidates, setCandidates] = useState<CandidateWithOffer[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithOffer | null>(null);

  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(ALL_FIELD_KEYS));

  useEffect(() => {
    if (open) {
      setStep("method");
      setExternalName("");
      setExternalEmail("");
      setMessage("");
      setSelectedCandidate(null);
      setCandidateSearch("");
      setSelectedFields(new Set(ALL_FIELD_KEYS));
    }
  }, [open]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/candidates/with-offers`);
      const data = await res.json();
      setCandidates(data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load candidates" });
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (method: "external" | "candidate") => {
    if (method === "external") {
      setStep("external-form");
    } else {
      loadCandidates();
      setStep("candidate-pick");
    }
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: { fields: { key: string }[] }) => {
    const allSelected = group.fields.every((f) => selectedFields.has(f.key));
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (allSelected) group.fields.forEach((f) => next.delete(f.key));
      else group.fields.forEach((f) => next.add(f.key));
      return next;
    });
  };

  const handleExternalSubmit = async () => {
    if (!externalName.trim() || !externalEmail.trim()) {
      toast({ variant: "destructive", title: "Please enter name and email" });
      return;
    }
    setLoading(true);
    try {
      await fetch(`${API}/onboarding-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "external",
          companyId: user?.companyId,
          requestedByUserId: user?.id,
          inviteeEmail: externalEmail.trim(),
          inviteeName: externalName.trim(),
          message: message.trim() || null,
        }),
      });
      setStep("done");
    } catch {
      toast({ variant: "destructive", title: "Failed to send invitation" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendDataRequest = async () => {
    if (!selectedCandidate) return;
    if (selectedFields.size === 0) {
      toast({ variant: "destructive", title: "Please select at least one field" });
      return;
    }
    setLoading(true);
    try {
      await fetch(`${API}/onboarding-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "candidate",
          companyId: user?.companyId,
          requestedByUserId: user?.id,
          candidateId: selectedCandidate.id,
          requestedFields: [...selectedFields],
          message: message.trim() || null,
        }),
      });
      setStep("done");
    } catch {
      toast({ variant: "destructive", title: "Failed to send request" });
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.fullName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(candidateSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "method" && (
          <>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Choose how you'd like to bring this person on board.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => handleMethodSelect("external")}
                className="group flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Invite via Email</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Send an invitation to someone outside iHR. They'll sign up and complete their profile before joining.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground self-end group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => handleMethodSelect("candidate")}
                className="group flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-sm">From Recruitment</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Select a candidate who received a conditional offer. Request access to their profile details directly.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground self-end group-hover:text-primary transition-colors" />
              </button>
            </div>
          </>
        )}

        {step === "external-form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={() => setStep("method")} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                Invite via Email
              </DialogTitle>
              <DialogDescription>
                They'll receive an email to sign up on iHR and complete their profile.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-name">Full Name</Label>
                <Input
                  id="inv-name"
                  placeholder="e.g. Priya Sharma"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-email">Email Address</Label>
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="e.g. priya@example.com"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-msg">Message (optional)</Label>
                <Textarea
                  id="inv-msg"
                  placeholder="Add a personal note to accompany the invite..."
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleExternalSubmit} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Invitation
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "candidate-pick" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={() => setStep("method")} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                Select from Recruitment
              </DialogTitle>
              <DialogDescription>
                Candidates who have received a conditional offer or are in the final stages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  {candidates.length === 0
                    ? "No candidates with offers found. Move a candidate to the offer stage in Recruitment first."
                    : "No candidates match your search."}
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredCandidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedCandidate?.id === c.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback>{c.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{c.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                        {c.headline && <div className="text-xs text-muted-foreground truncate">{c.headline}</div>}
                      </div>
                      <div className="shrink-0">
                        {c.applicationStatus && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {STATUS_LABELS[c.applicationStatus] ?? c.applicationStatus}
                          </Badge>
                        )}
                      </div>
                      {selectedCandidate?.id === c.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  disabled={!selectedCandidate}
                  onClick={() => setStep("fields")}
                >
                  Select Fields
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "fields" && selectedCandidate && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={() => setStep("candidate-pick")} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                Request Profile Details
              </DialogTitle>
              <DialogDescription>
                Select which details you need from{" "}
                <span className="font-medium text-foreground">{selectedCandidate.fullName}</span>. They'll be notified and can share this information directly.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{selectedFields.size} of {ALL_FIELD_KEYS.length} fields selected</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedFields(new Set(ALL_FIELD_KEYS))}
                    className="text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setSelectedFields(new Set())}
                    className="text-muted-foreground hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {FIELD_GROUPS.map((group) => {
                const allGroupSelected = group.fields.every((f) => selectedFields.has(f.key));
                const someGroupSelected = group.fields.some((f) => selectedFields.has(f.key));
                return (
                  <div key={group.group} className="rounded-lg border p-3 space-y-2">
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => toggleGroup(group)}
                    >
                      <Checkbox
                        checked={allGroupSelected ? true : someGroupSelected ? "indeterminate" : false}
                        onCheckedChange={() => toggleGroup(group)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm font-medium">{group.group}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                      {group.fields.map((f) => (
                        <div
                          key={f.key}
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => toggleField(f.key)}
                        >
                          <Checkbox
                            checked={selectedFields.has(f.key)}
                            onCheckedChange={() => toggleField(f.key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-muted-foreground">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="space-y-1.5">
                <Label htmlFor="req-msg">Message to candidate (optional)</Label>
                <Textarea
                  id="req-msg"
                  placeholder="E.g. Congratulations on your offer! Please share your details so we can complete your onboarding..."
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSendDataRequest} disabled={loading || selectedFields.size === 0}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Send Data Request
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="p-4 rounded-full bg-green-50">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {selectedCandidate ? "Data Request Sent!" : "Invitation Sent!"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {selectedCandidate
                  ? `${selectedCandidate.fullName} will be notified and can review, complete, and share their profile details with you.`
                  : `An invitation has been sent to ${externalEmail}. They can sign up and fill in their details before joining.`}
              </p>
            </div>
            <Button onClick={onClose} className="mt-2">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
