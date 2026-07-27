import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useListLeaves, useUpdateLeaveStatus, getListLeavesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export default function HrLeaves() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Fetch pending leaves only initially, or all if we want
  const { data: leaves, isLoading } = useListLeaves({ status: 'pending' }, { query: { queryKey: getListLeavesQueryKey({ status: 'pending' }) } });
  
  const updateMutation = useUpdateLeaveStatus();

  const handleUpdateStatus = (id: number, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Leave request ${status}` });
        queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: 'pending' }) });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to update status" });
      },
      onSettled: () => setUpdatingId(null)
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Approval</h1>
          <p className="text-muted-foreground">Review and manage employee time-off requests.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !leaves || leaves.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending leave requests.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-mono text-sm">{leave.employeeId}</TableCell>
                      <TableCell className="capitalize">{leave.leaveType}</TableCell>
                      <TableCell>
                        {format(new Date(leave.startDate + 'T00:00:00'), 'MMM d')} - {format(new Date(leave.endDate + 'T00:00:00'), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{leave.days}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={leave.reason ?? undefined}>{leave.reason}</TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-green-200 hover:bg-green-50 hover:text-green-700 text-green-600"
                          disabled={updatingId === leave.id}
                          onClick={() => handleUpdateStatus(leave.id, 'approved')}
                        >
                          {updatingId === leave.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-200 hover:bg-red-50 hover:text-red-700 text-red-600"
                          disabled={updatingId === leave.id}
                          onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                        >
                          {updatingId === leave.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
