import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useGetCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Users, Calendar, Activity } from "lucide-react";
import { format } from "date-fns";

export default function AdminCompanyDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: company, isLoading } = useGetCompany(
    id,
    { query: { enabled: !!id, queryKey: getGetCompanyQueryKey(id) } }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Details</h1>
            <p className="text-muted-foreground">View detailed information about this organization.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        ) : !company ? (
          <div className="text-center py-12 text-muted-foreground">
            Company not found.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{company.name}</CardTitle>
                  <CardDescription>slug: {company.slug}</CardDescription>
                </div>
                <Badge variant={
                  company.status === 'active' ? 'default' :
                  company.status === 'suspended' ? 'destructive' : 'secondary'
                } className="capitalize px-3 py-1 text-sm">
                  {company.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-y-6">
                  <div className="flex gap-3">
                    <Building className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">Industry</div>
                      <div className="text-sm text-muted-foreground">{company.industry}</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">Company Size</div>
                      <div className="text-sm text-muted-foreground">{company.companySize}</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">Current Plan</div>
                      <div className="text-sm text-muted-foreground capitalize">{company.plan || 'Starter'}</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">Joined Platform</div>
                      <div className="text-sm text-muted-foreground">
                        {company.createdAt ? format(new Date(company.createdAt), 'MMMM d, yyyy') : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registered Employees</span>
                    <span className="font-medium">{company.employeeCount || 0}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                
                <div className="pt-6 border-t flex flex-col gap-2">
                  <Button variant="outline" className="w-full justify-start">View Employees</Button>
                  <Button variant="outline" className="w-full justify-start">View Billing History</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
