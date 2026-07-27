import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useListPayslips, getListPayslipsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function HrPayroll() {
  const { data: payslips, isLoading } = useListPayslips({}, { query: { queryKey: getListPayslipsQueryKey() } });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payroll Overview</h1>
            <p className="text-muted-foreground">Manage employee salaries and payslips.</p>
          </div>
          <Button variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !payslips || payslips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No payroll records found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
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
                      <TableCell className="font-mono text-sm">{payslip.employeeId}</TableCell>
                      <TableCell>{MONTHS[payslip.month - 1]} {payslip.year}</TableCell>
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
                        <Button variant="ghost" size="icon" title="Download PDF">
                          <Download className="h-4 w-4" />
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
