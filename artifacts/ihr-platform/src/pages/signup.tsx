import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User } from "lucide-react";

export default function Signup() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-10">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight text-primary mb-2">
            <div className="w-9 h-9 rounded bg-primary text-primary-foreground flex items-center justify-center font-black text-xl">
              i
            </div>
            iHR
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-base">
            Choose the account type that fits your needs. You can always upgrade later.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Organisation Account */}
          <button
            type="button"
            onClick={() => setLocation("/register")}
            className="group text-left rounded-2xl border-2 border-border hover:border-primary bg-card hover:bg-primary/5 p-8 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-6 transition-colors">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Organisation Account</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Set up your company on iHR. Manage your team, run payroll, post jobs, and track attendance — all from one place.
            </p>
            <div className="space-y-1.5">
              {["Manage employees & payroll", "Post jobs & track applications", "Leave, attendance & HR tools", "14-day free trial"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
                Get started →
              </span>
            </div>
          </button>

          {/* Personal Account */}
          <button
            type="button"
            onClick={() => setLocation("/register/personal")}
            className="group text-left rounded-2xl border-2 border-border hover:border-primary bg-card hover:bg-primary/5 p-8 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-6 transition-colors">
              <User className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Personal Account</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Create a personal profile as a candidate or employee. Browse jobs, track applications, and manage your career.
            </p>
            <div className="space-y-1.5">
              {["Browse & apply for jobs", "Track your applications", "Manage your career profile", "Free forever"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
                Create profile →
              </span>
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
