import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useListJobs, useCreateJob, useUpdateJob, useDeleteJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, MoreHorizontal, Edit, Trash2, Link2, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const formSchema = z.object({
  title: z.string().min(2),
  department: z.string().min(2),
  employmentType: z.string(),
  experienceLevel: z.string(),
  workMode: z.string(),
  location: z.string().optional(),
  openings: z.coerce.number().min(1),
  status: z.string(),
  description: z.string().min(10, "Job description is required for ATS scoring (min 10 chars)")
});

export default function HrJobs() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: jobs, isLoading } = useListJobs({}, { query: { queryKey: getListJobsQueryKey() } });
  
  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const deleteMutation = useDeleteJob();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      department: "",
      employmentType: "full_time",
      experienceLevel: "mid",
      workMode: "onsite",
      location: "",
      openings: 1,
      status: "open",
      description: ""
    }
  });

  const openEdit = (job: any) => {
    setEditingId(job.id);
    form.reset({
      title: job.title,
      department: job.department,
      employmentType: job.employmentType,
      experienceLevel: job.experienceLevel,
      workMode: job.workMode,
      location: job.location || "",
      openings: job.openings,
      status: job.status,
      description: job.description || ""
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      title: "",
      department: "",
      employmentType: "full_time",
      experienceLevel: "mid",
      workMode: "onsite",
      location: "",
      openings: 1,
      status: "draft",
      description: ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this job?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Job deleted" });
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          toast({ title: "Job updated" });
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          setIsDialogOpen(false);
        }
      });
    } else {
      createMutation.mutate({ data: { ...values, companyId: user?.companyId ?? 0 } }, {
        onSuccess: () => {
          toast({ title: "Job created" });
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          setIsDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to create job", variant: "destructive" });
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Listings</h1>
            <p className="text-muted-foreground">Manage open positions and job descriptions.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Post New Job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Job" : "Create New Job"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Job Title</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="department" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="employmentType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="full_time">Full Time</SelectItem>
                            <SelectItem value="part_time">Part Time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="workMode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="onsite">On-site</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                            <SelectItem value="remote">Remote</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="experienceLevel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="entry">Entry</SelectItem>
                            <SelectItem value="mid">Mid</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="director">Director</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="openings" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Openings</FormLabel>
                          <FormControl><Input type="number" min="1" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Description <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the role, responsibilities, and requirements. Used for ATS candidate scoring."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Job
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type/Mode</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.department}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm capitalize">{job.employmentType.replace('_', ' ')}</span>
                          <span className="text-xs text-muted-foreground capitalize">{job.workMode}</span>
                        </div>
                      </TableCell>
                      <TableCell>{job.openings}</TableCell>
                      <TableCell>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="capitalize">
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {job.status === 'open' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const link = `${window.location.origin}/jobs/${job.id}`;
                                    navigator.clipboard.writeText(link);
                                    toast({ title: "Apply link copied!", description: "Share this link on your career page." });
                                  }}
                                >
                                  <Link2 className="h-4 w-4 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy apply link</TooltipContent>
                            </Tooltip>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(job)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              {job.status === 'open' && (
                                <DropdownMenuItem onClick={() => {
                                  const link = `${window.location.origin}/jobs/${job.id}`;
                                  navigator.clipboard.writeText(link);
                                  toast({ title: "Apply link copied!", description: "Share this link on your career page." });
                                }}>
                                  <Copy className="mr-2 h-4 w-4" /> Copy Apply Link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
