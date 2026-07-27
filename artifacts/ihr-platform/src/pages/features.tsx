import { PublicLayout } from "@/components/layouts/PublicLayout";
import { CheckCircle2, Zap, Clock, CreditCard, Users, BarChart3, Shield } from "lucide-react";

export default function Features() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-24 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Everything you need. <br/><span className="text-primary">Nothing you don't.</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            A carefully crafted suite of tools to handle the entire employee lifecycle.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 mb-24 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">AI-Powered ATS</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Stop drowning in resumes. Our ATS automatically scores and ranks candidates based on your job requirements.
            </p>
            <ul className="space-y-3">
              {[
                "Resume parsing and matching",
                "Automated screening questions",
                "Custom interview pipelines",
                "Collaborative team feedback"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-muted/30 p-8 shadow-sm h-80 flex items-center justify-center">
            {/* Visual placeholder */}
            <div className="text-center text-muted-foreground">
              <Zap className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
              <p className="font-medium">AI Scoring Visualization</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 mb-24 items-center flex-row-reverse">
          <div className="order-last lg:order-first rounded-xl border bg-muted/30 p-8 shadow-sm h-80 flex items-center justify-center">
            {/* Visual placeholder */}
            <div className="text-center text-muted-foreground">
              <Clock className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
              <p className="font-medium">Attendance Timeline</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-4">Smart Attendance</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Track time accurately with geofenced punch-ins and automated timesheets.
            </p>
            <ul className="space-y-3">
              {[
                "Location-based punch in/out",
                "Automated late tracking",
                "Overtime calculation",
                "Manager approval workflows"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
