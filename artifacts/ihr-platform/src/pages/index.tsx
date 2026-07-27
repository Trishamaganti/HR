import { useState } from "react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ArrowRight, CheckCircle2, BarChart3, Users, Zap, Shield, Globe, Clock, CreditCard } from "lucide-react";
import heroImg from "@assets/hero.png";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-24 pb-32">
        {/* Brand colour geometric shapes — behind content via z-0 */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute -right-24 -top-16 w-[480px] h-[260px] opacity-20"
            style={{ background: "#D7A364", transform: "skewX(-18deg) rotate(-6deg)", borderRadius: "18px" }} />
          <div className="absolute -right-8 top-16 w-[420px] h-[220px] opacity-22"
            style={{ background: "#E4CA70", transform: "skewX(-18deg) rotate(-6deg)", borderRadius: "18px" }} />
          <div className="absolute right-36 -top-8 w-[26px] h-[340px] opacity-55"
            style={{ background: "#683FE0", transform: "skewX(-18deg) rotate(-6deg)", borderRadius: "8px" }} />
          <div className="absolute right-14 -top-4 w-[26px] h-[300px] opacity-45"
            style={{ background: "#683FE0", transform: "skewX(-18deg) rotate(-6deg)", borderRadius: "8px" }} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/8 via-background to-background" style={{ zIndex: 0 }} />
        
        <div className="container relative mx-auto px-4 md:px-6" style={{ zIndex: 1 }}>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-6">
                Meet iHR Platform 2.0
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
                The control room for <span className="text-primary">ambitious</span> teams.
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl mb-8 max-w-xl">
                Hire faster, manage smarter, and align your workforce with an AI-powered HR platform that actually feels good to use.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-12 px-8 text-base" onClick={() => setLocation("/signup")}>
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => setLocation("/features")}>
                  Explore Features
                </Button>
              </div>
              
              <div className="mt-10 flex items-center gap-4 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> No credit card required</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> 14-day free trial</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> Cancel anytime</div>
              </div>
            </div>
            
            <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none">
              <div className="relative rounded-xl border bg-background/50 p-2 shadow-2xl backdrop-blur">
                {/* Dashboard mockup */}
                <div className="overflow-hidden rounded-lg border bg-white">
                  {/* Mockup top bar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: "#683FE0" }}>
                    <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                      <span className="text-white font-black text-xs">i</span>
                    </div>
                    <span className="text-white font-semibold text-xs">iHR Platform</span>
                    <div className="ml-auto flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-white/30" />
                      <div className="w-2 h-2 rounded-full bg-white/30" />
                      <div className="w-2 h-2 rounded-full bg-white/30" />
                    </div>
                  </div>
                  {/* Mockup content */}
                  <div className="p-4 bg-gray-50 space-y-3">
                    {/* KPI row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Employees", value: "142", color: "#683FE0" },
                        { label: "Open Roles", value: "8", color: "#D7A364" },
                        { label: "This Month", value: "+12", color: "#E4CA70" },
                      ].map((kpi) => (
                        <div key={kpi.label} className="rounded-lg bg-white border p-2.5 shadow-sm">
                          <div className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                          <div className="text-[10px] text-gray-400">{kpi.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Bar chart mockup */}
                    <div className="rounded-lg bg-white border p-3 shadow-sm">
                      <div className="text-[10px] font-semibold text-gray-500 mb-2">Hiring Pipeline</div>
                      <div className="flex items-end gap-1 h-14">
                        {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t"
                            style={{ height: `${h}%`, background: i % 3 === 0 ? "#683FE0" : i % 3 === 1 ? "#D7A364" : "#E4CA70", opacity: 0.85 }} />
                        ))}
                      </div>
                    </div>
                    {/* Employee list mockup */}
                    <div className="rounded-lg bg-white border shadow-sm divide-y">
                      {["Sarah Jenkins", "Marcus Liu", "Aisha Patel"].map((name, i) => (
                        <div key={name} className="flex items-center gap-2 px-3 py-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ background: i === 0 ? "#683FE0" : i === 1 ? "#D7A364" : "#E4CA70" }}>
                            {name[0]}
                          </div>
                          <span className="text-[11px] font-medium text-gray-700">{name}</span>
                          <div className="ml-auto w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${75 - i * 15}%`, background: "#683FE0" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating notification cards */}
                <div className="absolute -left-4 top-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                  <div className="rounded-lg border bg-background p-3 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">New Hire</p>
                        <p className="text-xs text-muted-foreground">Sarah Jenkins joined</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -right-4 bottom-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                  <div className="rounded-lg border bg-background p-3 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "#683FE0" + "1a", color: "#683FE0" }}>
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">98% Match</p>
                        <p className="text-xs text-muted-foreground">Top candidate found</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y py-12" style={{ background: "linear-gradient(90deg, #683FE0 0%, #7C3AED 30%, #D7A364 75%, #E4CA70 100%)" }}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">10k+</div>
              <div className="text-sm font-medium text-white/70">Active Companies</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">2M+</div>
              <div className="text-sm font-medium text-white/70">Employees Managed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">85%</div>
              <div className="text-sm font-medium text-white/70">Faster Hiring</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-sm font-medium text-white/70">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything you need to scale your team
            </h2>
            <p className="text-lg text-muted-foreground">
              A comprehensive suite of tools designed to handle every aspect of the employee lifecycle, from first touchpoint to daily management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-6 w-6" />,
                title: "AI-Powered ATS",
                description: "Automatically screen resumes, score candidates, and identify top talent without manual review."
              },
              {
                icon: <Clock className="h-6 w-6" />,
                title: "Smart Attendance",
                description: "Geofenced punch-ins, automated timesheets, and real-time absence tracking."
              },
              {
                icon: <CreditCard className="h-6 w-6" />,
                title: "One-Click Payroll",
                description: "Generate accurate payslips instantly with automated tax and deduction calculations."
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: "Employee Self-Service",
                description: "Empower your team to manage their own leaves, access documents, and update profiles."
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: "Advanced Analytics",
                description: "Gain deep insights into turnover, hiring velocity, and workforce costs."
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Enterprise Security",
                description: "Bank-grade encryption, role-based access control, and complete data privacy."
              }
            ].map((feature, i) => (
              <div key={i} className="group relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-y bg-primary text-primary-foreground py-24">
        <div className="container mx-auto px-4 md:px-6 text-center max-w-4xl">
          <Globe className="h-12 w-12 mx-auto mb-8 opacity-50" />
          <blockquote className="text-2xl md:text-4xl font-medium leading-tight mb-8">
            "iHR didn't just replace our messy spreadsheet system—it fundamentally changed how we think about our team. We hire 3x faster and our employees love the portal."
          </blockquote>
          <div className="font-semibold text-lg">Sarah Chen</div>
          <div className="opacity-80">VP of People, TechNova</div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="rounded-3xl bg-muted p-8 md:p-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Ready to transform your HR?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of forward-thinking companies that rely on iHR Platform. Setup takes minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base" onClick={() => setLocation("/register")}>
                Create Company Account
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-background" onClick={() => setLocation("/jobs")}>
                Browse Open Jobs
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
