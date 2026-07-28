import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateCandidate } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { Loader2, Plus, X, User, GraduationCap, MapPin, Phone, CreditCard, Users, Trash2, Upload, FileText, FolderOpen, CheckCircle2, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type BankCountry = "india" | "uk" | "usa" | "canada" | "australia";

const BANK_COUNTRY_CONFIG: Record<BankCountry, {
  label: string; flag: string;
  fields: { key: string; label: string; placeholder: string; hint?: string }[];
}> = {
  india: {
    label: "India", flag: "🇮🇳",
    fields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. HDFC Bank, SBI, ICICI" },
      { key: "bankAccountName", label: "Account Holder Name", placeholder: "Name as per bank records" },
      { key: "bankAccountNumber", label: "Account Number", placeholder: "e.g. 001234567890", hint: "10–18 digit account number" },
      { key: "bankIfscCode", label: "IFSC Code", placeholder: "e.g. HDFC0001234", hint: "11-character code (bank + branch)" },
      { key: "bankBranchName", label: "Branch Name", placeholder: "e.g. Koramangala, Bengaluru" },
    ],
  },
  uk: {
    label: "United Kingdom", flag: "🇬🇧",
    fields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Barclays, HSBC, Lloyds" },
      { key: "bankAccountName", label: "Account Holder Name", placeholder: "Name as per bank records" },
      { key: "bankAccountNumber", label: "Account Number", placeholder: "e.g. 12345678", hint: "8-digit account number" },
      { key: "bankIfscCode", label: "Sort Code", placeholder: "e.g. 20-41-55", hint: "6-digit sort code (##-##-##)" },
      { key: "bankBranchName", label: "Branch / Building Society", placeholder: "e.g. London City Branch" },
    ],
  },
  usa: {
    label: "United States", flag: "🇺🇸",
    fields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Chase, Bank of America, Wells Fargo" },
      { key: "bankAccountName", label: "Account Holder Name", placeholder: "Name as per bank records" },
      { key: "bankAccountNumber", label: "Account Number", placeholder: "e.g. 000123456789" },
      { key: "bankIfscCode", label: "ABA Routing Number", placeholder: "e.g. 021000021", hint: "9-digit ABA routing number" },
      { key: "bankBranchName", label: "Bank Branch / State", placeholder: "e.g. New York Branch, NY" },
    ],
  },
  canada: {
    label: "Canada", flag: "🇨🇦",
    fields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. RBC, TD Bank, Scotiabank" },
      { key: "bankAccountName", label: "Account Holder Name", placeholder: "Name as per bank records" },
      { key: "bankAccountNumber", label: "Account Number", placeholder: "e.g. 1234567" },
      { key: "bankIfscCode", label: "Transit Number", placeholder: "e.g. 04152", hint: "5-digit branch transit number" },
      { key: "bankBranchName", label: "Institution Number", placeholder: "e.g. 003", hint: "3-digit financial institution number" },
    ],
  },
  australia: {
    label: "Australia", flag: "🇦🇺",
    fields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Commonwealth, ANZ, NAB, Westpac" },
      { key: "bankAccountName", label: "Account Holder Name", placeholder: "Name as per bank records" },
      { key: "bankAccountNumber", label: "Account Number", placeholder: "e.g. 123456789", hint: "6–10 digit account number" },
      { key: "bankIfscCode", label: "BSB Code", placeholder: "e.g. 062-000", hint: "6-digit Bank State Branch code" },
      { key: "bankBranchName", label: "Branch Name", placeholder: "e.g. Sydney CBD Branch" },
    ],
  },
};

type DocCountry = "india" | "uk" | "usa" | "canada" | "australia";

const DOC_COUNTRY_CONFIG: Record<DocCountry, {
  label: string; flag: string;
  identity: { key: string; label: string }[];
  employment: { key: string; label: string }[];
  tax: { key: string; label: string }[];
}> = {
  india: {
    label: "India", flag: "🇮🇳",
    identity: [
      { key: "id_aadhaar", label: "Aadhaar Card" },
      { key: "id_pan", label: "PAN Card" },
      { key: "id_passport", label: "Passport" },
      { key: "id_driving", label: "Driving Licence" },
      { key: "id_voter", label: "Voter ID Card" },
    ],
    employment: [
      { key: "elig_offer", label: "Offer Letter" },
      { key: "elig_bgv", label: "Background Verification Report" },
      { key: "edu_degree", label: "Degree Certificate(s)" },
      { key: "edu_experience", label: "Experience Letter(s)" },
      { key: "edu_relieving", label: "Relieving Letter(s)" },
      { key: "edu_certifications", label: "Professional Certifications" },
    ],
    tax: [
      { key: "bank_cheque", label: "Cancelled Cheque" },
      { key: "bank_form11", label: "Form 11 / EPF Declaration" },
      { key: "tax_form16", label: "Form 16 (TDS Certificate)" },
      { key: "tax_itr", label: "Income Tax Returns (ITR)" },
    ],
  },
  uk: {
    label: "United Kingdom", flag: "🇬🇧",
    identity: [
      { key: "id_passport", label: "Passport" },
      { key: "id_ni", label: "National Insurance Card / Letter" },
      { key: "id_driving", label: "UK Driving Licence" },
      { key: "id_brp", label: "BRP (Biometric Residence Permit)" },
      { key: "id_visa", label: "Visa / Right to Work Document" },
    ],
    employment: [
      { key: "elig_rtw", label: "Right-to-Work Verification" },
      { key: "elig_bgv", label: "DBS Check / Police Clearance" },
      { key: "edu_degree", label: "Degree Certificate(s)" },
      { key: "edu_experience", label: "Employment Reference Letter(s)" },
      { key: "edu_certifications", label: "Professional Certifications" },
    ],
    tax: [
      { key: "bank_p45", label: "P45 — Previous Employment" },
      { key: "bank_p60", label: "P60 — End of Year Certificate" },
      { key: "bank_starter", label: "Starter Checklist (New Employee)" },
      { key: "tax_sa302", label: "SA302 Self-Assessment" },
    ],
  },
  usa: {
    label: "United States", flag: "🇺🇸",
    identity: [
      { key: "id_passport", label: "US Passport or Passport Card" },
      { key: "id_driving", label: "State Driver's License / ID" },
      { key: "id_ssn", label: "Social Security Card" },
      { key: "id_greencard", label: "Green Card / Permanent Resident Card" },
      { key: "id_ead", label: "EAD / Work Authorization Card" },
    ],
    employment: [
      { key: "elig_i9", label: "Form I-9 Employment Eligibility" },
      { key: "elig_bgv", label: "Background Check Report" },
      { key: "edu_degree", label: "Degree / Diploma Certificate(s)" },
      { key: "edu_experience", label: "Reference / Experience Letter(s)" },
      { key: "edu_certifications", label: "Professional Certifications" },
    ],
    tax: [
      { key: "bank_w4", label: "W-4 Employee Withholding Certificate" },
      { key: "bank_w2", label: "W-2 Wage and Tax Statement" },
      { key: "tax_1099", label: "1099 (Independent Contractor)" },
      { key: "tax_ssatax", label: "SSA-1099 Social Security Benefits" },
    ],
  },
  canada: {
    label: "Canada", flag: "🇨🇦",
    identity: [
      { key: "id_passport", label: "Canadian Passport" },
      { key: "id_sin", label: "SIN (Social Insurance Number) Letter" },
      { key: "id_driving", label: "Provincial Driver's Licence" },
      { key: "id_pr", label: "PR Card (Permanent Resident)" },
      { key: "id_wp", label: "Work Permit" },
    ],
    employment: [
      { key: "elig_bgv", label: "Police Clearance / Criminal Record Check" },
      { key: "edu_degree", label: "Degree / Diploma Certificate(s)" },
      { key: "edu_experience", label: "Reference / Experience Letter(s)" },
      { key: "edu_certifications", label: "Professional Certifications" },
      { key: "elig_rtw", label: "Work Authorization Documents" },
    ],
    tax: [
      { key: "bank_td1", label: "TD1 Federal Personal Tax Credits" },
      { key: "bank_td1p", label: "TD1 Provincial Personal Tax Credits" },
      { key: "tax_t4", label: "T4 Statement of Remuneration Paid" },
      { key: "tax_t1", label: "T1 General Income Tax Return" },
    ],
  },
  australia: {
    label: "Australia", flag: "🇦🇺",
    identity: [
      { key: "id_passport", label: "Australian Passport" },
      { key: "id_tfn", label: "Tax File Number (TFN) Declaration" },
      { key: "id_driving", label: "State Driver's Licence" },
      { key: "id_medicare", label: "Medicare Card" },
      { key: "id_visa", label: "Visa / Work Entitlement" },
    ],
    employment: [
      { key: "elig_bgv", label: "National Police Check" },
      { key: "elig_rtw", label: "Work Rights / Visa Entitlement" },
      { key: "edu_degree", label: "Degree / Qualification Certificate(s)" },
      { key: "edu_experience", label: "Reference / Experience Letter(s)" },
      { key: "edu_certifications", label: "Professional Certifications" },
    ],
    tax: [
      { key: "bank_tfn_dec", label: "TFN Declaration Form" },
      { key: "bank_super", label: "Superannuation Choice Form" },
      { key: "tax_payg", label: "PAYG Payment Summary" },
      { key: "tax_bas", label: "BAS (Business Activity Statement)" },
    ],
  },
};

const pgEntrySchema = z.object({
  specialization: z.string().optional(),
  university: z.string().optional(),
  passedOut: z.string().optional(),
  grade: z.string().optional(),
});

const referenceSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  designation: z.string().optional(),
});

const educationSchema = z.object({
  pgEntries: z.array(pgEntrySchema).optional(),
  ugSpecialization: z.string().optional(),
  ugCollege: z.string().optional(),
  ugPassedOut: z.string().optional(),
  ugGrade: z.string().optional(),
  hseSchool: z.string().optional(),
  hseCollege: z.string().optional(),
  hsePassedOut: z.string().optional(),
  hseGrade: z.string().optional(),
  seSchool: z.string().optional(),
  seCollege: z.string().optional(),
  sePassedOut: z.string().optional(),
  seGrade: z.string().optional(),
});

const emergencyContactSchema = z.object({
  fullName: z.string().optional(),
  relationship: z.string().optional(),
  phone: z.string().optional(),
});

const formSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  surname: z.string().optional(),
  fullName: z.string().min(2, "Full name is required"),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  dateOfBirth: z.string().optional(),
  personalEmail: z.string().optional(),
  mobile: z.string().optional(),
  fathersName: z.string().optional(),
  mothersName: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  skills: z.array(z.string()).optional(),
  education: educationSchema.optional(),
  currentAddress: z.string().optional(),
  homeAddress: z.string().optional(),
  emergencyContact1: emergencyContactSchema.optional(),
  emergencyContact2: emergencyContactSchema.optional(),
  references: z.array(referenceSchema).optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  bankBranchName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultPgEntry = () => ({ specialization: "", university: "", passedOut: "", grade: "" });
const defaultReference = () => ({ name: "", phone: "", email: "", company: "", designation: "" });

export default function CandidateProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [skillInput, setSkillInput] = useState("");
  const [docs, setDocs] = useState<Record<string, { name: string; size: string }[]>>({});
  const [bankCountry, setBankCountry] = useState<BankCountry>("india");
  const [docCountry, setDocCountry] = useState<DocCountry>("india");

  const handleFileUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newEntries = files.map(file => {
      const kb = (file.size / 1024).toFixed(0);
      const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${kb} KB`;
      return { name: file.name, size };
    });
    setDocs(prev => ({ ...prev, [key]: [...(prev[key] ?? []), ...newEntries] }));
    e.target.value = "";
  };

  const removeDoc = (key: string, idx: number) =>
    setDocs(prev => ({ ...prev, [key]: (prev[key] ?? []).filter((_, i) => i !== idx) }));

  const BASE = getApiUrl();
  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate-by-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const r = await fetch(`${BASE}/candidates?userId=${user.id}`);
      const arr = await r.json();
      return (arr[0] ?? null) as any;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useUpdateCandidate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "", middleName: "", surname: "", fullName: "",
      gender: "", maritalStatus: "", dateOfBirth: "", personalEmail: "",
      mobile: "", fathersName: "", mothersName: "",
      headline: "", location: "", linkedinUrl: "", githubUrl: "", skills: [],
      education: { pgEntries: [defaultPgEntry()] },
      currentAddress: "", homeAddress: "",
      emergencyContact1: {}, emergencyContact2: {},
      references: [defaultReference()],
      bankName: "", bankAccountName: "", bankAccountNumber: "", bankIfscCode: "", bankBranchName: "",
    },
  });

  const { fields: pgFields, append: appendPg, remove: removePg } = useFieldArray({
    control: form.control,
    name: "education.pgEntries",
  });

  const { fields: refFields, append: appendRef, remove: removeRef } = useFieldArray({
    control: form.control,
    name: "references",
  });

  useEffect(() => {
    if (!candidate) return;
    const ec = (candidate as any).emergencyContacts || [];
    const edu = (candidate as any).education || {};

    type PgEntry = { specialization?: string; university?: string; passedOut?: string; grade?: string };
    let pgEntries: PgEntry[] = [];
    if (Array.isArray(edu.pgEntries) && edu.pgEntries.length > 0) {
      pgEntries = edu.pgEntries;
    } else if (edu.pgSpecialization || edu.pgUniversity || edu.pgPassedOut) {
      pgEntries = [{
        specialization: edu.pgSpecialization || "",
        university: edu.pgUniversity || "",
        passedOut: edu.pgPassedOut || "",
        grade: edu.pgGrade || "",
      }];
    } else {
      pgEntries = [defaultPgEntry()];
    }

    // Handle references: support both old single-ref format and new array
    type RefEntry = { name?: string; phone?: string; email?: string; company?: string; designation?: string };
    let references: RefEntry[] = [];
    const savedRefs = (candidate as any).references;
    if (Array.isArray(savedRefs) && savedRefs.length > 0) {
      references = savedRefs;
    } else if ((candidate as any).refereeName || (candidate as any).refereeEmail) {
      references = [{
        name: (candidate as any).refereeName || "",
        phone: (candidate as any).refereePhone || "",
        email: (candidate as any).refereeEmail || "",
        company: "",
        designation: "",
      }];
    } else {
      references = [defaultReference()];
    }

    form.reset({
      firstName: (candidate as any).firstName || "",
      middleName: (candidate as any).middleName || "",
      surname: (candidate as any).surname || "",
      fullName: candidate.fullName || "",
      gender: (candidate as any).gender || "",
      maritalStatus: (candidate as any).maritalStatus || "",
      dateOfBirth: (candidate as any).dateOfBirth || "",
      personalEmail: (candidate as any).personalEmail || "",
      mobile: candidate.mobile || "",
      fathersName: (candidate as any).fathersName || "",
      mothersName: (candidate as any).mothersName || "",
      headline: candidate.headline || "",
      location: candidate.location || "",
      linkedinUrl: candidate.linkedinUrl || "",
      githubUrl: candidate.githubUrl || "",
      skills: candidate.skills || [],
      education: {
        pgEntries,
        ugSpecialization: edu.ugSpecialization || "",
        ugCollege: edu.ugCollege || "",
        ugPassedOut: edu.ugPassedOut || "",
        ugGrade: edu.ugGrade || "",
        hseSchool: edu.hseSchool || "",
        hseCollege: edu.hseCollege || "",
        hsePassedOut: edu.hsePassedOut || "",
        hseGrade: edu.hseGrade || "",
        seSchool: edu.seSchool || "",
        seCollege: edu.seCollege || "",
        sePassedOut: edu.sePassedOut || "",
        seGrade: edu.seGrade || "",
      },
      currentAddress: (candidate as any).currentAddress || "",
      homeAddress: (candidate as any).homeAddress || "",
      emergencyContact1: ec[0] || {},
      emergencyContact2: ec[1] || {},
      references,
      bankName: (candidate as any).bankName || "",
      bankAccountName: (candidate as any).bankAccountName || "",
      bankAccountNumber: (candidate as any).bankAccountNumber || "",
      bankIfscCode: (candidate as any).bankIfscCode || "",
      bankBranchName: (candidate as any).bankBranchName || "",
    });
  }, [candidate, form]);

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const current = form.getValues("skills") || [];
      if (!current.includes(skillInput.trim())) form.setValue("skills", [...current, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    form.setValue("skills", (form.getValues("skills") || []).filter(s => s !== skill));
  };

  function onSubmit(values: FormValues) {
    if (!user?.id) return;
    const { emergencyContact1, emergencyContact2, references, ...rest } = values;
    const emergencyContacts = [emergencyContact1, emergencyContact2].filter(
      ec => ec && (ec.fullName || ec.phone)
    );
    const cleanRefs = (references || []).filter(r => r.name || r.email || r.phone);
    updateMutation.mutate({
      id: (candidate as any)?.id ?? user.id,
      data: {
        ...rest,
        emergencyContacts: emergencyContacts as any,
        education: rest.education as any,
        ...(cleanRefs.length > 0 ? { references: cleanRefs } : {}) as any,
      }
    }, {
      onSuccess: (updated) => {
        toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
        queryClient.invalidateQueries({ queryKey: ["candidate-by-user", user?.id] });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Update Failed", description: "There was an error saving your profile." });
      }
    });
  }

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">Complete your profile to improve your chances with employers.</p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading your profile…</span>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="flex flex-wrap gap-1 mb-6 h-auto">
                <TabsTrigger value="personal" className="text-xs py-2 flex-1 min-w-[80px]">Personal</TabsTrigger>
                <TabsTrigger value="education" className="text-xs py-2 flex-1 min-w-[80px]">Education</TabsTrigger>
                <TabsTrigger value="address" className="text-xs py-2 flex-1 min-w-[70px]">Address</TabsTrigger>
                <TabsTrigger value="emergency" className="text-xs py-2 flex-1 min-w-[80px]">Emergency</TabsTrigger>
                <TabsTrigger value="reference" className="text-xs py-2 flex-1 min-w-[80px]">Reference</TabsTrigger>
                <TabsTrigger value="bank" className="text-xs py-2 flex-1 min-w-[60px]">Bank</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs py-2 flex-1 min-w-[90px] gap-1"><FolderOpen className="h-3 w-3" />Documents</TabsTrigger>
              </TabsList>

              {/* ── PERSONAL ── */}
              <TabsContent value="personal" className="space-y-6">
                <Card>
                  <CardHeader><SectionHeader icon={User} title="Name Details" /></CardHeader>
                  <CardContent className="grid md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="middleName" render={({ field }) => (
                      <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input placeholder="Michael" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="surname" render={({ field }) => (
                      <FormItem><FormLabel>Surname / Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem className="md:col-span-3"><FormLabel>Full Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="John Michael Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><SectionHeader icon={User} title="Personal Information" /></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem><FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                        <FormItem><FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="divorced">Divorced</SelectItem>
                              <SelectItem value="widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="mobile" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1 555 0100" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="personalEmail" render={({ field }) => (
                        <FormItem><FormLabel>Personal Email Address</FormLabel><FormControl><Input placeholder="john@personal.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="fathersName" render={({ field }) => (
                        <FormItem><FormLabel>Father's Full Name</FormLabel><FormControl><Input placeholder="Father's name" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="mothersName" render={({ field }) => (
                        <FormItem><FormLabel>Mother's Full Name</FormLabel><FormControl><Input placeholder="Mother's name" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Career Details</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="headline" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Professional Headline</FormLabel><FormControl><Input placeholder="e.g. Senior Frontend Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="City, Country" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                        <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="githubUrl" render={({ field }) => (
                        <FormItem><FormLabel>GitHub URL</FormLabel><FormControl><Input placeholder="https://github.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="skills" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills</FormLabel>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type a skill and press Enter..."
                              value={skillInput}
                              onChange={e => setSkillInput(e.target.value)}
                              onKeyDown={handleAddSkill}
                              onBlur={() => {
                                if (skillInput.trim()) {
                                  const current = form.getValues("skills") || [];
                                  if (!current.includes(skillInput.trim())) form.setValue("skills", [...current, skillInput.trim()]);
                                  setSkillInput("");
                                }
                              }}
                            />
                            <Button type="button" variant="secondary" onClick={() => {
                              if (skillInput.trim()) {
                                const current = form.getValues("skills") || [];
                                if (!current.includes(skillInput.trim())) form.setValue("skills", [...current, skillInput.trim()]);
                                setSkillInput("");
                              }
                            }}><Plus className="h-4 w-4" /></Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {field.value?.map(skill => (
                              <span key={skill} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                {skill}
                                <button type="button" onClick={() => removeSkill(skill)} className="text-primary hover:text-primary/70"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── EDUCATION ── */}
              <TabsContent value="education" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <h3 className="text-base font-semibold">Postgraduate / Master's Degree</h3>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5"
                      onClick={() => appendPg(defaultPgEntry())}>
                      <Plus className="h-4 w-4" /> Add Another
                    </Button>
                  </div>

                  {pgFields.map((pgField, idx) => (
                    <Card key={pgField.id} className="relative">
                      {pgFields.length > 1 && (
                        <button type="button" onClick={() => removePg(idx)}
                          className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {pgFields.length > 1 && (
                        <div className="px-6 pt-4">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Master's Degree #{idx + 1}
                          </span>
                        </div>
                      )}
                      <CardContent className={`grid md:grid-cols-2 gap-4 ${pgFields.length > 1 ? "pt-3" : "pt-6"}`}>
                        <FormField control={form.control} name={`education.pgEntries.${idx}.specialization`} render={({ field }) => (
                          <FormItem><FormLabel>Specialization & Branch</FormLabel><FormControl><Input placeholder="e.g. Computer Science" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`education.pgEntries.${idx}.university`} render={({ field }) => (
                          <FormItem><FormLabel>University Name</FormLabel><FormControl><Input placeholder="e.g. MIT" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`education.pgEntries.${idx}.passedOut`} render={({ field }) => (
                          <FormItem><FormLabel>Month & Year of Passed Out</FormLabel><FormControl><Input placeholder="e.g. June 2020" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`education.pgEntries.${idx}.grade`} render={({ field }) => (
                          <FormItem><FormLabel>Percentage / Grade / CGPA</FormLabel><FormControl><Input placeholder="e.g. 8.5 CGPA or 85%" {...field} /></FormControl></FormItem>
                        )} />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader><SectionHeader icon={GraduationCap} title="Undergraduate / Bachelor's Degree" /></CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="education.ugSpecialization" render={({ field }) => (
                      <FormItem><FormLabel>Specialization & Branch</FormLabel><FormControl><Input placeholder="e.g. Information Technology" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.ugCollege" render={({ field }) => (
                      <FormItem><FormLabel>College Name</FormLabel><FormControl><Input placeholder="e.g. Stanford University" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.ugPassedOut" render={({ field }) => (
                      <FormItem><FormLabel>Month & Year of Passed Out</FormLabel><FormControl><Input placeholder="e.g. May 2018" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.ugGrade" render={({ field }) => (
                      <FormItem><FormLabel>Percentage / Grade / CGPA</FormLabel><FormControl><Input placeholder="e.g. 7.8 CGPA or 78%" {...field} /></FormControl></FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><SectionHeader icon={GraduationCap} title="Higher Secondary Education (12th)" /></CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="education.hseSchool" render={({ field }) => (
                      <FormItem><FormLabel>Stream / Group</FormLabel><FormControl><Input placeholder="e.g. Science - PCM" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.hseCollege" render={({ field }) => (
                      <FormItem><FormLabel>College / School Name</FormLabel><FormControl><Input placeholder="e.g. City High School" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.hsePassedOut" render={({ field }) => (
                      <FormItem><FormLabel>Month & Year of Passed Out</FormLabel><FormControl><Input placeholder="e.g. March 2015" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.hseGrade" render={({ field }) => (
                      <FormItem><FormLabel>Percentage / Grade</FormLabel><FormControl><Input placeholder="e.g. 88% or A+" {...field} /></FormControl></FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><SectionHeader icon={GraduationCap} title="Secondary Education (10th)" /></CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="education.seSchool" render={({ field }) => (
                      <FormItem><FormLabel>Board / Stream</FormLabel><FormControl><Input placeholder="e.g. CBSE" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.seCollege" render={({ field }) => (
                      <FormItem><FormLabel>School Name</FormLabel><FormControl><Input placeholder="e.g. Delhi Public School" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.sePassedOut" render={({ field }) => (
                      <FormItem><FormLabel>Month & Year of Passed Out</FormLabel><FormControl><Input placeholder="e.g. March 2013" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="education.seGrade" render={({ field }) => (
                      <FormItem><FormLabel>Percentage / Grade</FormLabel><FormControl><Input placeholder="e.g. 92% or A1" {...field} /></FormControl></FormItem>
                    )} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── ADDRESS ── */}
              <TabsContent value="address" className="space-y-4">
                <Card>
                  <CardHeader><SectionHeader icon={MapPin} title="Addresses" /></CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="currentAddress" render={({ field }) => (
                      <FormItem><FormLabel>Current Address</FormLabel><FormControl><Textarea placeholder="Enter your current address..." className="resize-none min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="homeAddress" render={({ field }) => (
                      <FormItem><FormLabel>Home / Permanent Address</FormLabel><FormControl><Textarea placeholder="Enter your permanent home address..." className="resize-none min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── EMERGENCY CONTACTS ── */}
              <TabsContent value="emergency" className="space-y-4">
                {[1, 2].map(n => (
                  <Card key={n}>
                    <CardHeader><SectionHeader icon={Phone} title={`Emergency Contact ${n}`} /></CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4">
                      <FormField control={form.control} name={`emergencyContact${n as 1 | 2}.fullName`} render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Contact's full name" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`emergencyContact${n as 1 | 2}.relationship`} render={({ field }) => (
                        <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input placeholder="e.g. Spouse, Parent" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`emergencyContact${n as 1 | 2}.phone`} render={({ field }) => (
                        <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="+1 555 0100" {...field} /></FormControl></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* ── REFERENCES ── */}
              <TabsContent value="reference" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">Employment References</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5"
                    onClick={() => appendRef(defaultReference())}>
                    <Plus className="h-4 w-4" /> Add Reference
                  </Button>
                </div>

                {refFields.map((refField, idx) => (
                  <Card key={refField.id} className="relative">
                    {refFields.length > 1 && (
                      <button type="button" onClick={() => removeRef(idx)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove this reference">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <CardHeader>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Reference #{idx + 1}
                      </span>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4 pt-0">
                      <FormField control={form.control} name={`references.${idx}.name`} render={({ field }) => (
                        <FormItem><FormLabel>Full Name of Referee</FormLabel><FormControl><Input placeholder="Referee's full name" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`references.${idx}.phone`} render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1 555 0100" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`references.${idx}.email`} render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="referee@company.com" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`references.${idx}.company`} render={({ field }) => (
                        <FormItem><FormLabel>Company / Organisation</FormLabel><FormControl><Input placeholder="e.g. Acme Corp" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`references.${idx}.designation`} render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Designation / Position</FormLabel><FormControl><Input placeholder="e.g. Senior Manager" {...field} /></FormControl></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* ── BANK ── */}
              <TabsContent value="bank" className="space-y-4">
                {/* Country Selector */}
                <Card>
                  <CardHeader><SectionHeader icon={Globe} title="Select Your Country" /></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-2">
                      {(Object.entries(BANK_COUNTRY_CONFIG) as [BankCountry, typeof BANK_COUNTRY_CONFIG[BankCountry]][]).map(([key, cfg]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setBankCountry(key)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                            bankCountry === key
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          <span className="text-2xl">{cfg.flag}</span>
                          <span className={`text-[11px] font-medium leading-tight ${bankCountry === key ? "text-primary" : "text-muted-foreground"}`}>
                            {cfg.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Country-Specific Banking Fields */}
                <Card>
                  <CardHeader>
                    <SectionHeader
                      icon={CreditCard}
                      title={`${BANK_COUNTRY_CONFIG[bankCountry].flag} ${BANK_COUNTRY_CONFIG[bankCountry].label} — Bank Details`}
                    />
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    {BANK_COUNTRY_CONFIG[bankCountry].fields.map((f, idx) => (
                      <FormField
                        key={`${bankCountry}-${f.key}`}
                        control={form.control}
                        name={f.key as any}
                        render={({ field }) => (
                          <FormItem className={idx === BANK_COUNTRY_CONFIG[bankCountry].fields.length - 1 && BANK_COUNTRY_CONFIG[bankCountry].fields.length % 2 !== 0 ? "md:col-span-2" : ""}>
                            <FormLabel>{f.label}</FormLabel>
                            <FormControl><Input placeholder={f.placeholder} {...field} /></FormControl>
                            {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── DOCUMENTS ── */}
              <TabsContent value="documents" className="space-y-5">
                {(() => {
                  const DocRow = ({ docKey, label, accept }: { docKey: string; label: string; accept?: string }) => {
                    const fileList = docs[docKey] ?? [];
                    const hasFiles = fileList.length > 0;
                    const inputId = `file-${docKey}`;
                    return (
                      <div className={`rounded-lg border transition-colors ${hasFiles ? "border-green-200 bg-green-50/30" : "bg-background"}`}>
                        {/* Header row */}
                        <div className="flex items-center gap-3 p-3">
                          {hasFiles
                            ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{label}</p>
                            {!hasFiles && <p className="text-xs text-muted-foreground">No files uploaded</p>}
                            {hasFiles && (
                              <p className="text-xs text-green-600 font-medium">
                                {fileList.length} file{fileList.length > 1 ? "s" : ""} uploaded
                              </p>
                            )}
                          </div>
                          {/* hidden input — multiple allowed */}
                          <input
                            id={inputId}
                            type="file"
                            multiple
                            className="hidden"
                            accept={accept ?? ".pdf,.jpg,.jpeg,.png,.doc,.docx"}
                            onChange={e => handleFileUpload(docKey, e)}
                          />
                          <label htmlFor={inputId}>
                            <Button type="button" size="sm" variant={hasFiles ? "outline" : "secondary"} className="gap-1.5 cursor-pointer shrink-0" asChild>
                              <span>
                                <Upload className="h-3.5 w-3.5" />
                                {hasFiles ? "Add More" : "Upload"}
                              </span>
                            </Button>
                          </label>
                        </div>

                        {/* Uploaded file list */}
                        {hasFiles && (
                          <div className="border-t border-green-200 divide-y divide-green-100">
                            {fileList.map((f, idx) => (
                              <div key={idx} className="flex items-center gap-2 px-3 py-2">
                                <FileText className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                <span className="flex-1 text-xs text-green-700 truncate font-medium">{f.name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">{f.size}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDoc(docKey, idx)}
                                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                  title="Remove this file"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  const SectionBlock = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <h3 className="text-base font-semibold">{title}</h3>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">{children}</CardContent>
                    </Card>
                  );

                  const cfg = DOC_COUNTRY_CONFIG[docCountry];

                  return (
                    <>
                      {/* Country Selector */}
                      <Card>
                        <CardHeader><SectionHeader icon={Globe} title="Select Your Country" /></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-5 gap-2">
                            {(Object.entries(DOC_COUNTRY_CONFIG) as [DocCountry, typeof DOC_COUNTRY_CONFIG[DocCountry]][]).map(([key, c]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setDocCountry(key)}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                                  docCountry === key
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                                }`}
                              >
                                <span className="text-2xl">{c.flag}</span>
                                <span className={`text-[11px] font-medium leading-tight ${docCountry === key ? "text-primary" : "text-muted-foreground"}`}>{c.label}</span>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                        <FolderOpen className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                        <span>Showing documents required for <strong>{cfg.flag} {cfg.label}</strong>. Supported formats: PDF, JPG, PNG, DOC.</span>
                      </div>

                      {/* Identity & Verification */}
                      <SectionBlock icon={User} title={`${cfg.flag} Identity & Verification`}>
                        <div className="grid md:grid-cols-2 gap-1.5">
                          {cfg.identity.map(d => <DocRow key={d.key} docKey={d.key} label={d.label} />)}
                        </div>
                      </SectionBlock>

                      {/* Employment & Education */}
                      <SectionBlock icon={GraduationCap} title="Employment & Education">
                        <div className="grid md:grid-cols-2 gap-1.5">
                          {cfg.employment.map(d => <DocRow key={d.key} docKey={d.key} label={d.label} />)}
                        </div>
                      </SectionBlock>

                      {/* Banking & Tax */}
                      <SectionBlock icon={CreditCard} title={`${cfg.flag} Banking & Tax Documents`}>
                        <div className="grid md:grid-cols-2 gap-1.5">
                          {cfg.tax.map(d => <DocRow key={d.key} docKey={d.key} label={d.label} />)}
                        </div>
                      </SectionBlock>

                      {/* Always-present: Resume & Education certs */}
                      <SectionBlock icon={Users} title="Universal Documents">
                        <p className="text-xs text-muted-foreground mb-2">These documents are required regardless of country.</p>
                        <div className="grid md:grid-cols-2 gap-1.5">
                          <DocRow docKey="univ_resume" label="Latest Resume / CV" />
                          <DocRow docKey="edu_transcripts" label="Academic Transcripts" />
                          <DocRow docKey="edu_recommendation" label="Recommendation Letter(s)" />
                          <DocRow docKey="elig_bgv_consent" label="Background Check Consent Form" />
                        </div>
                      </SectionBlock>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
