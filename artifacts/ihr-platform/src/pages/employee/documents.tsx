import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Printer, Send, Loader2, CheckCircle } from "lucide-react";

type GenDoc = { id: number; type: string; title: string; content: string; status: string; createdAt: string; sentAt?: string; };

const TYPE_LABELS: Record<string, string> = {
  offer_letter: "Offer Letter",
  conditional_offer: "Conditional Offer",
  payslip: "Payslip",
};

function printDoc(html: string) {
  const win = window.open("", "_blank", "width=880,height=950");
  if (!win) { alert("Please allow popups to print documents."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

export default function EmployeeDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<GenDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<GenDoc | null>(null);

  useEffect(() => {
    if (!user) return;
    const companyId = (user as any).companyId;
    const userId = user.id;
    // Fetch employee record to get employeeId
    fetch(`/api/employees?companyId=${companyId}`)
      .then(r => r.json())
      .then((emps: any[]) => {
        const emp = emps.find((e: any) => e.userId === userId || e.email === user.email);
        if (!emp) return [];
        return fetch(`/api/documents?companyId=${companyId}&employeeId=${emp.id}`).then(r => r.json());
      })
      .then((d: GenDoc[]) => {
        if (Array.isArray(d)) setDocs(d.filter(doc => doc.status === "sent").reverse());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">Offer letters, payslips, and other documents from your employer.</p>
        </div>

        {docs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <FileText className="w-10 h-10 opacity-20" />
              <p className="text-sm">No documents have been sent to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{doc.title}</span>
                        <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100 shrink-0">
                          <Send className="w-3 h-3" />Received
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="capitalize">{TYPE_LABELS[doc.type] ?? doc.type}</span>
                        <span>·</span>
                        <span>{doc.sentAt ? new Date(doc.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : ""}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewDoc(doc)} className="gap-1.5 h-8">
                        <CheckCircle className="w-3.5 h-3.5" /> View
                      </Button>
                      <Button size="sm" onClick={() => printDoc(doc.content)} className="gap-1.5 h-8">
                        <Printer className="w-3.5 h-3.5" /> Download PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!viewDoc} onOpenChange={o => !o && setViewDoc(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base">{viewDoc?.title}</DialogTitle>
                <DialogDescription>{viewDoc && new Date(viewDoc.sentAt ?? viewDoc.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</DialogDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => viewDoc && printDoc(viewDoc.content)} className="gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print / Download PDF
              </Button>
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
