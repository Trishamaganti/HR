import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useListCompanies, useUpdateCompany, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Eye, ShieldBan, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";

export default function AdminCompanies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data: companies, isLoading } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() }
  });

  const updateMutation = useUpdateCompany();

  const handleToggleStatus = (companyId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setUpdatingId(companyId);

    updateMutation.mutate({
      id: companyId,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        toast({
          title: "Status Updated",
          description: `Company is now ${newStatus}.`,
        });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not change company status.",
        });
      },
      onSettled: () => {
        setUpdatingId(null);
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Manage all organizations on the platform.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !companies || companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No companies registered yet.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.industry}</TableCell>
                        <TableCell className="capitalize">{company.plan || 'starter'}</TableCell>
                        <TableCell>{company.employeeCount || 0}</TableCell>
                        <TableCell>
                          <Badge variant={
                            company.status === 'active' ? 'default' :
                            company.status === 'suspended' ? 'destructive' : 'secondary'
                          } className="capitalize">
                            {company.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          <Link href={`/admin/companies/${company.id}`}>
                            <Button variant="ghost" size="icon" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleStatus(company.id, company.status)}
                            disabled={updatingId === company.id}
                            title={company.status === 'active' ? 'Suspend' : 'Activate'}
                          >
                            {updatingId === company.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : company.status === 'active' ? (
                              <ShieldBan className="h-4 w-4 text-destructive" />
                            ) : (
                              <ShieldCheck className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
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
