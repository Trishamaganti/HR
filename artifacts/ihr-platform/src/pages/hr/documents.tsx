import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, FileText, Send, Eye, CheckCircle, Printer,
  Plus, Trash2, FileCheck, Clock, AlertCircle, RefreshCw,
} from "lucide-react";

type Employee = { id: number; fullName: string; employeeCode: string; designation?: string; department?: string; email: string; companyId: number; salary?: number; basicSalary?: number; hra?: number; transportAllowance?: number; medicalAllowance?: number; specialAllowance?: number; joiningDate?: string; employmentType?: string; location?: string; reportingManager?: string; leaveBalance?: number; panNumber?: string; bankAccountNumber?: string; probationEndDate?: string; };
type Payroll = { id: number; employeeId: number; month: number; year: number; basicSalary?: number; allowances?: number; deductions?: number; netSalary: number; status: string; };
type DocSettings = { logo?: string; letterhead?: string; stamp?: string; signature?: string; companyName?: string; companyAddress?: string; companyPhone?: string; companyEmail?: string; hrName?: string; hrTitle?: string; };
type Template = { id: number; type: string; content: string; };
type GenDoc = { id: number; employeeId: number; employeeName?: string; employeeEmail?: string; type: string; title: string; content: string; status: string; createdAt: string; sentAt?: string; };

const TYPE_LABELS: Record<string, string> = {
  offer_letter: "Offer Letter",
  conditional_offer: "Conditional Offer",
  payslip: "Payslip",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function statusBadge(status: string) {
  if (status === "draft") return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Draft</Badge>;
  if (status === "approved") return <Badge className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (status === "sent") return <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100"><Send className="w-3 h-3" />Sent</Badge>;
  return <Badge>{status}</Badge>;
}

function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function printDoc(html: string) {
  const win = window.open("", "_blank", "width=880,height=950");
  if (!win) { alert("Please allow popups to print/download documents."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

function buildTemplateData(
  emp: Employee,
  settings: DocSettings,
  extra: Record<string, string>,
  payroll?: Payroll,
): Record<string, string> {
  const today = new Date();
  const gross = (emp.basicSalary ?? 0) + (emp.hra ?? 0) + (emp.transportAllowance ?? 0) + (emp.medicalAllowance ?? 0) + (emp.specialAllowance ?? 0);
  const pf = Math.round((emp.basicSalary ?? 0) * 0.12);
  const pt = 200;
  const tds = 0;
  const otherDed = payroll ? Math.max(0, (payroll.deductions ?? 0) - pf - pt - tds) : 0;
  const totalDed = pf + pt + tds + otherDed;
  const monthIdx = payroll ? payroll.month - 1 : today.getMonth();

  return {
    employee_name: emp.fullName ?? "",
    employee_code: emp.employeeCode ?? "",
    designation: emp.designation ?? "",
    department: emp.department ?? "",
    location: emp.location ?? "",
    joining_date: emp.joiningDate ?? "",
    employment_type: emp.employmentType?.replace("_", " ") ?? "",
    salary: (emp.salary ?? 0).toLocaleString("en-IN"),
    basic_salary: (emp.basicSalary ?? 0).toLocaleString("en-IN"),
    hra: (emp.hra ?? 0).toLocaleString("en-IN"),
    transport_allowance: (emp.transportAllowance ?? 0).toLocaleString("en-IN"),
    medical_allowance: (emp.medicalAllowance ?? 0).toLocaleString("en-IN"),
    special_allowance: (emp.specialAllowance ?? 0).toLocaleString("en-IN"),
    reporting_manager: emp.reportingManager ?? "",
    annual_leaves: String(emp.leaveBalance ?? 20),
    pan_number: emp.panNumber ?? "—",
    bank_account_number: emp.bankAccountNumber ?? "—",
    gross_salary: gross.toLocaleString("en-IN"),
    pf_deduction: pf.toLocaleString("en-IN"),
    professional_tax: pt.toLocaleString("en-IN"),
    tds: tds.toLocaleString("en-IN"),
    other_deductions: otherDed.toLocaleString("en-IN"),
    total_deductions: totalDed.toLocaleString("en-IN"),
    net_salary: payroll ? payroll.netSalary.toLocaleString("en-IN") : (gross - totalDed).toLocaleString("en-IN"),
    month_name: MONTH_NAMES[monthIdx] ?? "",
    year: String(payroll ? payroll.year : today.getFullYear()),
    company_name: settings.companyName ?? "",
    company_address: settings.companyAddress ?? "",
    company_email: settings.companyEmail ?? "",
    company_phone: settings.companyPhone ?? "",
    hr_name: settings.hrName ?? "",
    hr_title: settings.hrTitle ?? "",
    logo: settings.logo ?? "",
    letterhead: settings.letterhead ?? "",
    stamp: settings.stamp ?? "",
    signature: settings.signature ?? "",
    date: today.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    // override with extra fields
    ...extra,
  };
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const companyId: number = (user as any)?.companyId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [docSettings, setDocSettings] = useState<DocSettings>({});
  const [docs, setDocs] = useState<GenDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate form state
  const [selEmployeeId, setSelEmployeeId] = useState("");
  const [docType, setDocType] = useState("offer_letter");
  const [selPayrollId, setSelPayrollId] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // View modal
  const [viewDoc, setViewDoc] = useState<GenDoc | null>(null);

  const loadAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [empsR, payR, tmplR, settR, docsR] = await Promise.all([
        fetch(`/api/employees?companyId=${companyId}`).then(r => r.json()),
        fetch(`/api/payroll`).then(r => r.json()),
        fetch(`/api/document-templates?companyId=${companyId}`).then(r => r.json()),
        fetch(`/api/document-settings?companyId=${companyId}`).then(r => r.json()),
        fetch(`/api/documents?companyId=${companyId}`).then(r => r.json()),
      ]);
      setEmployees(Array.isArray(empsR) ? empsR : empsR.employees ?? []);
      setPayrolls(Array.isArray(payR) ? payR : []);
      setTemplates(Array.isArray(tmplR) ? tmplR : []);
      setDocSettings(settR ?? {});
      setDocs(Array.isArray(docsR) ? docsR : []);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectedEmployee = employees.find(e => String(e.id) === selEmployeeId);
  const empPayrolls = payrolls.filter(p => p.employeeId === selectedEmployee?.id);
  const selectedPayroll = payrolls.find(p => String(p.id) === selPayrollId);
  const template = templates.find(t => t.type === docType);

  const buildPreview = () => {
    if (!selectedEmployee || !template) {
      toast({ title: "Select an employee and ensure the template is saved.", variant: "destructive" });
      return "";
    }
    return fillTemplate(template.content, buildTemplateData(selectedEmployee, docSettings, extra, selectedPayroll));
  };

  const handlePreview = () => {
    const html = buildPreview();
    if (!html) return;
    setPreviewHtml(html);
    setPreviewing(true);
  };

  const handleGenerate = async () => {
    const html = buildPreview();
    if (!html) return;
    if (!selectedEmployee) return;
    setGenerating(true);
    try {
      const title = `${TYPE_LABELS[docType]} – ${selectedEmployee.fullName}${docType === "payslip" && selectedPayroll ? ` (${MONTH_NAMES[selectedPayroll.month - 1]} ${selectedPayroll.year})` : ""}`;
      const r = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, employeeId: selectedEmployee.id, payrollId: selectedPayroll?.id ?? null, type: docType, title, content: html }),
      });
      if (!r.ok) throw new Error();
      toast({ title: "Document generated", description: "Saved as draft. Review and send from the All Documents tab." });
      await loadAll();
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const r = await fetch(`/api/documents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      const label = status === "approved" ? "Document approved" : "Document sent to employee";
      toast({ title: label });
      await loadAll();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const deleteDoc = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    toast({ title: "Document deleted" });
    await loadAll();
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground text-sm mt-1">Generate offer letters, conditional offers, and payslips — then review and send to employees.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate" className="gap-1.5"><Plus className="w-4 h-4" />Generate New</TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5">
              <FileText className="w-4 h-4" />All Documents
              {docs.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{docs.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ---- GENERATE TAB ---- */}
          <TabsContent value="generate" className="mt-4">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Document Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offer_letter">Offer Letter</SelectItem>
                        <SelectItem value="conditional_offer">Conditional Offer</SelectItem>
                        <SelectItem value="payslip">Payslip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Employee</Label>
                    <Select value={selEmployeeId} onValueChange={v => { setSelEmployeeId(v); setSelPayrollId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.fullName} <span className="text-muted-foreground">({e.employeeCode})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {docType === "payslip" && selEmployeeId && (
                    <div className="space-y-1.5">
                      <Label>Pay Period</Label>
                      <Select value={selPayrollId} onValueChange={setSelPayrollId}>
                        <SelectTrigger><SelectValue placeholder="Select payroll record…" /></SelectTrigger>
                        <SelectContent>
                          {empPayrolls.length === 0
                            ? <SelectItem value="" disabled>No payroll records found</SelectItem>
                            : empPayrolls.map(p => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {MONTH_NAMES[p.month - 1]} {p.year} — ₹{p.netSalary.toLocaleString("en-IN")}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Extra fields for offer-type docs */}
                  {(docType === "offer_letter" || docType === "conditional_offer") && selEmployeeId && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Offer Details</p>
                      {[
                        { key: "offer_expiry_date", label: "Offer Expiry Date", placeholder: "e.g. 10 August 2026" },
                        { key: "probation_period", label: "Probation Period", placeholder: "e.g. 3 months" },
                        { key: "notice_period", label: "Notice Period", placeholder: "e.g. 30 days" },
                      ].map(f => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs">{f.label}</Label>
                          <Input
                            value={extra[f.key] ?? ""}
                            onChange={e => setExtra(x => ({ ...x, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!template && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      No template found for this document type. Go to Document Templates to set one up.
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={handlePreview} disabled={!selEmployeeId || !template} className="flex-1 gap-1.5">
                      <Eye className="w-4 h-4" /> Preview
                    </Button>
                    <Button onClick={handleGenerate} disabled={!selEmployeeId || !template || generating || (docType === "payslip" && !selPayrollId)} className="flex-1 gap-1.5">
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                      Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Live preview panel */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Document Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {previewHtml ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground">Preview of {TYPE_LABELS[docType]}</span>
                        <Button variant="outline" size="sm" onClick={() => printDoc(previewHtml)} className="gap-1.5">
                          <Printer className="w-3.5 h-3.5" /> Print / Download
                        </Button>
                      </div>
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full rounded border bg-white"
                        style={{ height: "520px" }}
                        title="Document Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[520px] text-center text-muted-foreground gap-3">
                      <FileText className="w-12 h-12 opacity-20" />
                      <p className="text-sm">Select an employee and click Preview<br />to see the rendered document.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---- ALL DOCUMENTS TAB ---- */}
          <TabsContent value="all" className="mt-4">
            {docs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <FileText className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No documents generated yet. Use the Generate New tab to create one.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {docs.slice().reverse().map(doc => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{doc.title}</span>
                            {statusBadge(doc.status)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                            <span>{doc.employeeName ?? `Employee #${doc.employeeId}`}</span>
                            <span>·</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString("en-IN")}</span>
                            {doc.sentAt && <><span>·</span><span className="text-green-600">Sent {new Date(doc.sentAt).toLocaleDateString("en-IN")}</span></>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)} className="gap-1.5 h-8">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => printDoc(doc.content)} className="gap-1.5 h-8">
                            <Printer className="w-3.5 h-3.5" /> Print
                          </Button>
                          {doc.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(doc.id, "approved")} className="gap-1.5 h-8 border-blue-300 text-blue-700 hover:bg-blue-50">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </Button>
                          )}
                          {doc.status === "approved" && (
                            <Button size="sm" onClick={() => updateStatus(doc.id, "sent")} className="gap-1.5 h-8 bg-green-600 hover:bg-green-700">
                              <Send className="w-3.5 h-3.5" /> Send to Employee
                            </Button>
                          )}
                          {doc.status === "sent" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(doc.id, "sent")} className="gap-1.5 h-8 text-green-700 border-green-300" disabled>
                              <Send className="w-3.5 h-3.5" /> Sent
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc.id)} className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={o => !o && setViewDoc(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base">{viewDoc?.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  {viewDoc && statusBadge(viewDoc.status)}
                  <span className="text-xs">· {viewDoc?.employeeName}</span>
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {viewDoc?.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => { updateStatus(viewDoc.id, "approved"); setViewDoc(null); }} className="gap-1.5 border-blue-300 text-blue-700">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </Button>
                )}
                {viewDoc?.status === "approved" && (
                  <Button size="sm" onClick={() => { updateStatus(viewDoc.id, "sent"); setViewDoc(null); }} className="gap-1.5 bg-green-600 hover:bg-green-700">
                    <Send className="w-3.5 h-3.5" /> Send to Employee
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => viewDoc && printDoc(viewDoc.content)} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print / Download PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-4">
            {viewDoc && (
              <iframe
                srcDoc={viewDoc.content}
                className="w-full h-full rounded border"
                title="Document"
                sandbox="allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
