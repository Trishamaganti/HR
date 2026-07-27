import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListApplications } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

const DEMO_APPLICATIONS = [
  { id: "d1", jobTitle: "Senior Frontend Engineer", companyName: "TechCorp Pvt Ltd", appliedAt: "2026-04-10T09:00:00Z", status: "interview" },
  { id: "d2", jobTitle: "Product Designer", companyName: "DesignHub Solutions", appliedAt: "2026-04-02T11:30:00Z", status: "shortlisted" },
  { id: "d3", jobTitle: "Backend Engineer", companyName: "CloudStack Inc", appliedAt: "2026-03-22T14:00:00Z", status: "rejected" },
  { id: "d4", jobTitle: "DevOps Engineer", companyName: "InfraMinds Ltd", appliedAt: "2026-03-15T08:45:00Z", status: "hired" },
  { id: "d5", jobTitle: "HR Business Partner", companyName: "PeopleFirst Corp", appliedAt: "2026-05-01T10:00:00Z", status: "applied" },
];

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "hired" || status === "final_offer") return "default";
  if (status === "rejected") return "destructive";
  if (status === "conditional_offer" || status === "verification") return "outline";
  return "secondary";
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    applied: "Applied",
    ats_tracking: "ATS Review",
    screening: "Screening",
    shortlisted: "Shortlisted",
    interview: "Interview",
    conditional_offer: "Conditional Offer",
    verification: "Verification",
    final_offer: "Final Offer",
    hired: "Hired",
    rejected: "Rejected",
  };
  return map[status] ?? status;
};

export default function CandidateApplications() {
  const { user } = useAuth();
  // Pass userId — the backend resolves the correct candidatesTable.id automatically,
  // since user.id (usersTable) ≠ candidatesTable.id.
  const { data: applications, isLoading } = useListApplications(
    { userId: user?.id } as any,
    { query: { enabled: !!user?.id, queryKey: ["my_applications", user?.id] } }
  );

  const hasRealApps = applications && applications.length > 0;
  const showDemo = !isLoading && !hasRealApps;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
            <p className="text-muted-foreground">View and track your submitted job applications.</p>
          </div>
          <Link href="/jobs">
            <Button>Find Jobs</Button>
          </Link>
        </div>

        {showDemo && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Info className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <span>
              <strong>Demo preview</strong> — sample applications are shown below. Apply for real jobs to see your actual history here.
            </span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{showDemo ? "Sample Application History" : "Application History"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="text-primary-foreground font-semibold">Job Title</TableHead>
                      <TableHead className="text-primary-foreground font-semibold">Company</TableHead>
                      <TableHead className="text-primary-foreground font-semibold">Applied Date</TableHead>
                      <TableHead className="text-right text-primary-foreground font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(hasRealApps ? applications : DEMO_APPLICATIONS).map((app) => (
                      <TableRow key={app.id} className={showDemo ? "opacity-75" : ""}>
                        <TableCell className="font-medium">{app.jobTitle}</TableCell>
                        <TableCell>{(app as any).companyName}</TableCell>
                        <TableCell>
                          {app.appliedAt ? format(new Date(app.appliedAt), "MMM d, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={statusVariant(app.status)} className="capitalize">
                            {statusLabel(app.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
