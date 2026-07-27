import { PublicLayout } from "@/components/layouts/PublicLayout";
import { useListJobs } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Jobs() {
  const { data: jobs, isLoading } = useListJobs({}, { query: { queryKey: ["jobs"] } });

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16 md:px-6 max-w-5xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Open Positions</h1>
          <p className="text-xl text-muted-foreground">Find your next role at top companies using iHR.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border p-6 flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <Skeleton className="h-10 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {jobs?.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-muted/20">
                <p className="text-muted-foreground">No open jobs available at the moment.</p>
              </div>
            ) : (
              jobs?.map((job) => (
                <div key={job.id} className="rounded-xl border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors hover:border-primary/50 hover:bg-muted/10">
                  <div>
                    <Link href={`/jobs/${job.id}`}>
                      <h3 className="text-xl font-bold mb-1 hover:text-primary transition-colors cursor-pointer">{job.title}</h3>
                    </Link>
                    <p className="text-muted-foreground font-medium mb-4">{job.companyName || 'Company'}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> {job.location}
                        </div>
                      )}
                      {job.workMode && (
                        <div className="flex items-center gap-1 capitalize">
                          <Briefcase className="h-4 w-4" /> {job.workMode}
                        </div>
                      )}
                      <div className="flex items-center gap-1 capitalize">
                        <Clock className="h-4 w-4" /> {job.employmentType.replace('_', ' ')}
                      </div>
                      {(job.salaryMin || job.salaryMax) && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" /> 
                          {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ''}
                          {job.salaryMin && job.salaryMax ? ' - ' : ''}
                          {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-4">
                    {job.department && <Badge variant="secondary">{job.department}</Badge>}
                    <Link href={`/jobs/${job.id}`}>
                      <Button>View Details</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
