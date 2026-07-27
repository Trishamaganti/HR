import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListPayslips, getListPayslipsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Download, FileText } from "lucide-react";
import { format } from "date-fns";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function EmployeePayslips() {
  const { user } = useAuth();
  const empId = user?.employeeId ? parseInt(user.employeeId as string, 10) : user?.id;
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const { data: payslips, isLoading } = useListPayslips(
    { employeeId: empId },
    { query: { enabled: !!empId, queryKey: getListPayslipsQueryKey({ employeeId: empId }) } }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payslips</h1>
          <p className="text-muted-foreground">View and download your monthly salary statements.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Salary History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !payslips || payslips.length === 0 ? (
              <div className="text-center py-12 border rounded-md text-muted-foreground bg-muted/20">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No payslips found.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((payslip) => (
                      <TableRow key={payslip.id}>
                        <TableCell className="font-medium">
                          {MONTHS[payslip.month - 1]} {payslip.year}
                        </TableCell>
                        <TableCell>${payslip.basicSalary?.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-primary">${payslip.netSalary?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            payslip.status === 'paid' ? 'default' :
                            payslip.status === 'processed' ? 'secondary' : 'outline'
                          } className="capitalize">
                            {payslip.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPayslip(payslip)}>
                            <FileText className="h-4 w-4 mr-2" /> View
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

      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayslip && (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Salary for</div>
                  <div className="text-xl font-bold">{MONTHS[selectedPayslip.month - 1]} {selectedPayslip.year}</div>
                </div>
                <Badge variant={selectedPayslip.status === 'paid' ? 'default' : 'secondary'} className="uppercase">
                  {selectedPayslip.status}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span className="font-medium">${selectedPayslip.basicSalary?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allowances</span>
                  <span className="font-medium text-green-600">+ ${selectedPayslip.allowances?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deductions & Taxes</span>
                  <span className="font-medium text-destructive">- ${selectedPayslip.deductions?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-3 font-bold text-lg">
                  <span>Net Salary</span>
                  <span className="text-primary">${selectedPayslip.netSalary?.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
