import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-24 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground">
            No hidden fees. No surprise charges. Just pay for what you use.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter */}
          <div className="rounded-2xl border bg-card p-8 shadow-sm flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <p className="text-muted-foreground mb-6">For small teams getting started.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">$29</span>
              <span className="text-muted-foreground font-medium">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {["Up to 20 employees", "Basic ATS", "Attendance tracking", "Standard support"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button className="w-full" variant="outline">Start Free Trial</Button>
            </Link>
          </div>

          {/* Growth */}
          <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-md flex flex-col relative scale-105">
            <div className="absolute -top-4 left-0 right-0 text-center">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Growth</h3>
            <p className="text-muted-foreground mb-6">For growing mid-sized companies.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">$99</span>
              <span className="text-muted-foreground font-medium">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Up to 100 employees", 
                "AI-Powered ATS", 
                "Advanced Attendance & Leaves", 
                "Payroll Automation",
                "Priority support"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button className="w-full">Start Free Trial</Button>
            </Link>
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border bg-card p-8 shadow-sm flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
            <p className="text-muted-foreground mb-6">For large organizations.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">Custom</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Unlimited employees", 
                "Custom workflows", 
                "Dedicated account manager", 
                "SSO & Advanced Security",
                "Custom integrations"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/contact">
              <Button className="w-full" variant="outline">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
