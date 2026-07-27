import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useRegisterCompany } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email("Please enter a valid work email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain digits only"),
});

const detailsSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().min(2, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  adminName: z.string().min(2, "Your name is required"),
  mobile: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function callApi(path: string, body: Record<string, unknown>) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Verify Email", "Enter OTP", "Organisation Details"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground/40"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : num}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground/40"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${num < current ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DemoBanner({ otp }: { otp: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
      <span className="text-amber-500 mt-0.5">⚠</span>
      <div className="text-sm">
        <p className="font-semibold text-amber-800">Demo mode — no real email sent</p>
        <p className="text-amber-700">Your one-time code is: <span className="font-mono font-bold tracking-widest text-amber-900">{otp}</span></p>
        <p className="text-amber-600 text-xs mt-0.5">In production this code would be emailed to you.</p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: setAuthContext } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const emailForm = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });
  const detailsForm = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { companyName: "", industry: "", companySize: "", adminName: "", mobile: "", password: "", confirmPassword: "" },
  });

  const registerMutation = useRegisterCompany();

  async function onSendOtp(values: z.infer<typeof emailSchema>) {
    setSendingOtp(true);
    try {
      const data = await callApi("/auth/send-otp", { email: values.email });
      setVerifiedEmail(values.email);
      setDemoOtp(data.otp ?? "");
      setStep(2);
      otpForm.reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to send OTP", description: err.message });
    } finally {
      setSendingOtp(false);
    }
  }

  async function onVerifyOtp(values: z.infer<typeof otpSchema>) {
    setVerifyingOtp(true);
    try {
      await callApi("/auth/verify-otp", { email: verifiedEmail, otp: values.otp });
      setStep(3);
      detailsForm.reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Verification failed", description: err.message });
    } finally {
      setVerifyingOtp(false);
    }
  }

  function onRegister(values: z.infer<typeof detailsSchema>) {
    registerMutation.mutate(
      { data: { companyName: values.companyName, industry: values.industry, companySize: values.companySize, adminName: values.adminName, email: verifiedEmail, mobile: values.mobile, password: values.password } },
      {
        onSuccess: (data) => {
          setAuthContext(data.token, data.user);
          toast({ title: "Welcome to iHR!", description: "Your company account has been created." });
          setLocation("/hr/dashboard");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Registration failed", description: err?.message ?? "Please try again." });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Link href="/signup">
        <Button variant="ghost" className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </Link>

      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight text-primary mb-4">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-black">i</div>
            iHR
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create your company account</h1>
          <p className="text-muted-foreground text-sm">Start your 14-day free trial. No credit card required.</p>
        </div>

        <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <Steps current={step} />

          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Verify your work email</p>
                    <p className="text-xs text-muted-foreground">We'll send a 6-digit code to confirm it's you.</p>
                  </div>
                </div>
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@yourcompany.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11" disabled={sendingOtp}>
                  {sendingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP…</> : "Send Verification Code"}
                </Button>
              </form>
            </Form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Enter the code sent to</p>
                    <p className="text-xs text-primary font-mono">{verifiedEmail}</p>
                  </div>
                </div>

                {demoOtp && <DemoBanner otp={demoOtp} />}

                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>6-Digit OTP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456"
                          maxLength={6}
                          className="text-center text-xl tracking-[0.4em] font-mono h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11" disabled={verifyingOtp}>
                  {verifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</> : "Verify Email"}
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                  onClick={() => setStep(1)}
                >
                  Use a different email
                </button>
              </form>
            </Form>
          )}

          {/* ── Step 3: Organisation details ── */}
          {step === 3 && (
            <Form {...detailsForm}>
              <form onSubmit={detailsForm.handleSubmit(onRegister)} className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Email verified: <span className="font-mono text-primary">{verifiedEmail}</span>
                </p>

                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Company Details</h3>
                  <FormField control={detailsForm.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={detailsForm.control} name="industry" render={({ field }) => (
                      <FormItem><FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="technology">Technology & Software</SelectItem>
                            <SelectItem value="finance">Finance & Banking</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="retail">Retail & E-commerce</SelectItem>
                            <SelectItem value="services">Professional Services</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={detailsForm.control} name="companySize" render={({ field }) => (
                      <FormItem><FormLabel>Company Size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="1-10">1–10 employees</SelectItem>
                            <SelectItem value="11-50">11–50 employees</SelectItem>
                            <SelectItem value="51-200">51–200 employees</SelectItem>
                            <SelectItem value="201-500">201–500 employees</SelectItem>
                            <SelectItem value="500+">500+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t">
                  <h3 className="font-semibold border-b pb-2 pt-2">Admin Account</h3>
                  <FormField control={detailsForm.control} name="adminName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={detailsForm.control} name="mobile" render={({ field }) => (
                    <FormItem><FormLabel>Mobile <span className="text-muted-foreground font-normal">(optional)</span></FormLabel><FormControl><Input placeholder="+1 (555) 000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={detailsForm.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={detailsForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="Re-enter password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <Button type="submit" className="w-full h-12 text-base mt-2" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating account…</> : "Create Company Account"}
                </Button>
              </form>
            </Form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
