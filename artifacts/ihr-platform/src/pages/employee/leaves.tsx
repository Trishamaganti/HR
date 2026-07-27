import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListLeaves, useCreateLeave, getListLeavesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(5, "Please provide a reason"),
});

export default function EmployeeLeaves() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const empId = user?.employeeId ? parseInt(user.employeeId as string, 10) : user?.id;

  const { data: leaves, isLoading } = useListLeaves(
    { employeeId: empId },
    { query: { enabled: !!empId, queryKey: getListLeavesQueryKey({ employeeId: empId }) } }
  );

  const createMutation = useCreateLeave();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!empId) return;
    
    createMutation.mutate({
      data: {
        employeeId: empId,
        ...values
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Leave Applied",
          description: "Your leave request has been submitted for approval.",
        });
        queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ employeeId: empId }) });
        setIsDialogOpen(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Application Failed",
          description: error?.message || "Could not apply for leave. Please try again.",
        });
      }
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
            <p className="text-muted-foreground">Apply for time off and view your balance.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Apply Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
                <DialogDescription>
                  Submit a new leave request. It will be routed to your manager for approval.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="leaveType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leave Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="casual">Casual Leave</SelectItem>
                            <SelectItem value="sick">Sick Leave</SelectItem>
                            <SelectItem value="earned">Earned Leave</SelectItem>
                            <SelectItem value="maternity">Maternity/Paternity</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Please provide details for your leave..." className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Request
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !leaves || leaves.length === 0 ? (
              <div className="text-center py-12 border rounded-md text-muted-foreground bg-muted/20">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No leave requests found.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium capitalize">{leave.leaveType}</TableCell>
                        <TableCell>
                          {format(new Date(leave.startDate + 'T00:00:00'), 'MMM d')} - {format(new Date(leave.endDate + 'T00:00:00'), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {leave.reason}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={
                            leave.status === 'approved' ? 'default' :
                            leave.status === 'rejected' ? 'destructive' : 'secondary'
                          } className="capitalize">
                            {leave.status}
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
