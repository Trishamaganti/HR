import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Eye, RotateCcw, Loader2, CheckCircle2, FileText,
  ChevronDown, ChevronUp, X, AlertCircle, FileUp,
} from "lucide-react";

/* ─── File converters ───────────────────────────────────────────────── */

async function convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
      ],
    },
  );
  // Wrap in a full HTML document with reasonable base styles
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;font-size:14px;line-height:1.7}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
td,th{padding:6px 10px;border:1px solid #ccc}
img{max-width:100%}
h1,h2,h3{color:#333}
</style></head><body>${result.value}</body></html>`;
}

async function convertPdfToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Use the bundled worker via CDN-equivalent inline approach
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageImages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    pageImages.push(canvas.toDataURL("image/jpeg", 0.85));
  }

  const pagesHtml = pageImages
    .map(
      (src, i) =>
        `<div class="page"><img src="${src}" alt="Page ${i + 1}"/></div>`,
    )
    .join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:20px;background:#e5e5e5;font-family:Arial,sans-serif}
.page{background:#fff;margin:0 auto 20px;max-width:850px;box-shadow:0 2px 8px rgba(0,0,0,.15);display:block}
.page img{width:100%;display:block}
</style></head><body>${pagesHtml}</body></html>`;
}

/* ─── Placeholder reference ─────────────────────────────────────────── */
const PLACEHOLDER_GROUPS = [
  {
    label: "Employee",
    items: [
      ["{{employee_name}}", "Full name"],
      ["{{employee_code}}", "Employee ID / code"],
      ["{{designation}}", "Job title / designation"],
      ["{{department}}", "Department"],
      ["{{joining_date}}", "Date of joining"],
      ["{{employment_type}}", "Full Time / Part Time etc."],
      ["{{location}}", "Work location"],
      ["{{reporting_manager}}", "Manager name"],
      ["{{annual_leaves}}", "Leave entitlement"],
      ["{{pan_number}}", "PAN number"],
      ["{{bank_account_number}}", "Bank account"],
    ],
  },
  {
    label: "Compensation",
    items: [
      ["{{salary}}", "Annual CTC"],
      ["{{basic_salary}}", "Monthly basic salary"],
      ["{{hra}}", "HRA"],
      ["{{transport_allowance}}", "Transport allowance"],
      ["{{medical_allowance}}", "Medical allowance"],
      ["{{special_allowance}}", "Special allowance"],
      ["{{gross_salary}}", "Gross salary"],
      ["{{net_salary}}", "Net take-home"],
      ["{{total_deductions}}", "Total deductions"],
      ["{{pf_deduction}}", "PF deduction"],
      ["{{professional_tax}}", "Professional tax"],
    ],
  },
  {
    label: "Offer / Payslip",
    items: [
      ["{{offer_expiry_date}}", "Acceptance deadline"],
      ["{{probation_period}}", "Probation duration"],
      ["{{notice_period}}", "Notice period"],
      ["{{month_name}}", "Month (payslip)"],
      ["{{year}}", "Year (payslip)"],
      ["{{date}}", "Today's date"],
    ],
  },
  {
    label: "Company & Brand",
    items: [
      ["{{company_name}}", "Your company name"],
      ["{{company_address}}", "Company address"],
      ["{{company_email}}", "Company email"],
      ["{{company_phone}}", "Company phone"],
      ["{{hr_name}}", "HR signatory name"],
      ["{{hr_title}}", "HR signatory title"],
      ["{{logo}}", "Company logo (auto-injected)"],
      ["{{letterhead}}", "Letterhead image (auto-injected)"],
      ["{{stamp}}", "Official stamp (auto-injected)"],
      ["{{signature}}", "Authorised signature (auto-injected)"],
    ],
  },
];

/* ─── Built-in default templates ────────────────────────────────────── */
const DEFAULT_OFFER_LETTER = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;font-size:14px;line-height:1.7}
.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;border-bottom:3px solid #6c3fc0;padding-bottom:20px}
.logo{max-height:80px;max-width:180px;object-fit:contain}
.company-info{text-align:right;font-size:12px;color:#555}
.company-name{font-size:17px;font-weight:bold;color:#6c3fc0}
.date{margin-bottom:20px}
.subject{font-weight:bold;color:#6c3fc0;margin:20px 0;font-size:15px}
h3{color:#6c3fc0;font-size:14px;margin-top:24px;margin-bottom:10px;border-left:3px solid #6c3fc0;padding-left:8px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
td{padding:7px 12px;border:1px solid #ddd}
td:first-child{background:#f5f0ff;font-weight:600;width:45%}
.sig-section{display:flex;justify-content:space-between;margin-top:40px;flex-wrap:wrap;gap:24px}
.sig-block{min-width:200px}
.sig-img{max-height:55px;display:block;margin-bottom:4px}
.stamp-img{max-height:70px;display:block;margin-bottom:4px}
.sign-line{border-bottom:1px solid #333;width:220px;margin:28px 0 8px}
.footer{margin-top:40px;border-top:1px solid #eee;padding-top:10px;font-size:11px;color:#999;text-align:center}
</style></head><body>
<div class="header">
  <img src="{{logo}}" class="logo" onerror="this.style.display='none'"/>
  <div class="company-info"><div class="company-name">{{company_name}}</div><div>{{company_address}}</div><div>{{company_phone}} | {{company_email}}</div></div>
</div>
<div class="date">Date: <strong>{{date}}</strong></div>
<p><strong>To,</strong><br/><strong>{{employee_name}}</strong></p>
<div class="subject">Subject: Offer of Employment – {{designation}}</div>
<p>Dear <strong>{{employee_name}}</strong>,</p>
<p>We are delighted to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>{{company_name}}</strong>.</p>
<h3>Employment Details</h3>
<table>
  <tr><td>Employee Code</td><td>{{employee_code}}</td></tr>
  <tr><td>Designation</td><td>{{designation}}</td></tr>
  <tr><td>Department</td><td>{{department}}</td></tr>
  <tr><td>Location</td><td>{{location}}</td></tr>
  <tr><td>Date of Joining</td><td>{{joining_date}}</td></tr>
  <tr><td>Employment Type</td><td>{{employment_type}}</td></tr>
  <tr><td>Probation Period</td><td>{{probation_period}}</td></tr>
  <tr><td>Notice Period</td><td>{{notice_period}}</td></tr>
  <tr><td>Reporting Manager</td><td>{{reporting_manager}}</td></tr>
  <tr><td>Annual Leave</td><td>{{annual_leaves}} days</td></tr>
</table>
<h3>Compensation (Annual CTC: ₹{{salary}})</h3>
<table>
  <tr><td>Basic Salary (Monthly)</td><td>₹{{basic_salary}}</td></tr>
  <tr><td>HRA (Monthly)</td><td>₹{{hra}}</td></tr>
  <tr><td>Transport Allowance</td><td>₹{{transport_allowance}}</td></tr>
  <tr><td>Medical Allowance</td><td>₹{{medical_allowance}}</td></tr>
  <tr><td>Special Allowance</td><td>₹{{special_allowance}}</td></tr>
</table>
<p>This offer is subject to satisfactory background verification. Kindly confirm your acceptance by <strong>{{offer_expiry_date}}</strong>.</p>
<p>We look forward to having you on board.</p>
<div class="sig-section">
  <div class="sig-block">
    <p><strong>For {{company_name}}</strong></p>
    <img src="{{signature}}" class="sig-img" onerror="this.style.display='none'"/>
    <img src="{{stamp}}" class="stamp-img" onerror="this.style.display='none'"/>
    <p><strong>{{hr_name}}</strong><br/>{{hr_title}}</p>
  </div>
  <div class="sig-block">
    <p><strong>Acceptance by Employee</strong></p>
    <div class="sign-line"></div>
    <p>{{employee_name}}<br/>Date: _______________</p>
  </div>
</div>
<div class="footer">{{company_name}} | {{company_address}} | {{company_email}} | {{company_phone}}</div>
</body></html>`;

const DEFAULT_CONDITIONAL_OFFER = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;font-size:14px;line-height:1.7}
.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;border-bottom:3px solid #d97706;padding-bottom:20px}
.logo{max-height:80px;max-width:180px;object-fit:contain}
.company-info{text-align:right;font-size:12px;color:#555}
.company-name{font-size:17px;font-weight:bold;color:#d97706}
.conditions{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0}
.conditions ul{margin:8px 0 0;padding-left:20px}
.conditions li{margin-bottom:6px;font-size:13px}
h3{color:#d97706;font-size:14px;margin-top:24px;margin-bottom:10px;border-left:3px solid #d97706;padding-left:8px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
td{padding:7px 12px;border:1px solid #ddd}
td:first-child{background:#fffbeb;font-weight:600;width:45%}
.sig-section{display:flex;justify-content:space-between;margin-top:40px;flex-wrap:wrap;gap:24px}
.sig-block{min-width:200px}
.sig-img{max-height:55px;display:block;margin-bottom:4px}
.stamp-img{max-height:70px;display:block;margin-bottom:4px}
.sign-line{border-bottom:1px solid #333;width:220px;margin:28px 0 8px}
.footer{margin-top:40px;border-top:1px solid #eee;padding-top:10px;font-size:11px;color:#999;text-align:center}
</style></head><body>
<div class="header">
  <img src="{{logo}}" class="logo" onerror="this.style.display='none'"/>
  <div class="company-info"><div class="company-name">{{company_name}}</div><div>{{company_address}}</div><div>{{company_phone}} | {{company_email}}</div></div>
</div>
<div class="date" style="margin-bottom:20px">Date: <strong>{{date}}</strong></div>
<p><strong>To,</strong><br/><strong>{{employee_name}}</strong></p>
<p style="font-weight:bold;color:#d97706;margin:20px 0">Subject: Conditional Offer of Employment – {{designation}}</p>
<p>Dear <strong>{{employee_name}}</strong>,</p>
<p>We are pleased to extend this <strong>conditional offer</strong> for the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>{{company_name}}</strong>, subject to the conditions listed below.</p>
<div class="conditions">
  <strong>⚠ This offer is conditional upon:</strong>
  <ul>
    <li>Satisfactory completion of background verification and reference checks</li>
    <li>Submission and verification of all original educational and experience certificates</li>
    <li>Clearance from your previous employer (relieving letter / experience letter)</li>
    <li>Successful completion of any pre-employment medical examination</li>
  </ul>
</div>
<h3>Proposed Employment Details</h3>
<table>
  <tr><td>Designation</td><td>{{designation}}</td></tr>
  <tr><td>Department</td><td>{{department}}</td></tr>
  <tr><td>Location</td><td>{{location}}</td></tr>
  <tr><td>Proposed Joining Date</td><td>{{joining_date}}</td></tr>
  <tr><td>Employment Type</td><td>{{employment_type}}</td></tr>
  <tr><td>Probation Period</td><td>{{probation_period}}</td></tr>
  <tr><td>Notice Period</td><td>{{notice_period}}</td></tr>
  <tr><td>Proposed Annual CTC</td><td>₹{{salary}}</td></tr>
</table>
<p>This conditional offer will stand void if conditions are not met within <strong>30 days</strong> of the issue date or by <strong>{{offer_expiry_date}}</strong>, whichever is earlier.</p>
<div class="sig-section">
  <div class="sig-block">
    <p><strong>For {{company_name}}</strong></p>
    <img src="{{signature}}" class="sig-img" onerror="this.style.display='none'"/>
    <img src="{{stamp}}" class="stamp-img" onerror="this.style.display='none'"/>
    <p><strong>{{hr_name}}</strong><br/>{{hr_title}}</p>
  </div>
  <div class="sig-block">
    <p><strong>Accepted by</strong></p>
    <div class="sign-line"></div>
    <p>{{employee_name}}<br/>Date: _______________</p>
  </div>
</div>
<div class="footer">{{company_name}} | {{company_address}} | {{company_email}} | {{company_phone}}</div>
</body></html>`;

const DEFAULT_PAYSLIP = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;font-size:13px}
.header{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#6c3fc0,#8b5cf6);padding:20px 24px;border-radius:10px 10px 0 0}
.co-name{color:#fff;font-size:20px;font-weight:bold}
.co-addr{color:rgba(255,255,255,0.8);font-size:11px;margin-top:3px}
.logo{max-height:55px;max-width:140px;object-fit:contain;filter:brightness(0) invert(1)}
.slip-title{background:#f5f0ff;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #6c3fc0}
.slip-title h2{color:#6c3fc0;margin:0;font-size:16px;letter-spacing:1px}
.emp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px;background:#fafafa;border:1px solid #eee;border-radius:8px;margin:16px 0}
.ei-label{color:#999;font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.ei-val{font-weight:600;font-size:13px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}
.section{border:1px solid #eee;border-radius:8px;overflow:hidden}
.sh{padding:9px 14px;font-weight:600;font-size:13px}
.sh-earn{background:#6c3fc0;color:#fff}
.sh-ded{background:#e53e3e;color:#fff}
table{width:100%;border-collapse:collapse}
td{padding:7px 14px;border-bottom:1px solid #f5f5f5;font-size:12px}
td:last-child{text-align:right;font-weight:500}
.tot td{background:#f5f0ff;font-weight:bold;color:#6c3fc0;border-top:2px solid #6c3fc0;font-size:13px}
.tot-d td{background:#fff5f5;font-weight:bold;color:#e53e3e;border-top:2px solid #e53e3e;font-size:13px}
.net{margin-top:16px;background:linear-gradient(135deg,#6c3fc0,#8b5cf6);color:#fff;padding:18px 24px;border-radius:8px;display:flex;justify-content:space-between;align-items:center}
.net-label{font-size:13px;opacity:.9}
.net-amt{font-size:28px;font-weight:bold}
.sig-section{display:flex;justify-content:flex-end;margin-top:28px;padding-top:14px;border-top:1px solid #eee}
.sig-img{max-height:48px;display:block;margin:0 auto 4px}
.stamp-img{max-height:60px;display:block;margin:0 auto 4px}
.footer{margin-top:14px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #f0f0f0;padding-top:10px}
</style></head><body>
<div class="header">
  <div><div class="co-name">{{company_name}}</div><div class="co-addr">{{company_address}}</div></div>
  <img src="{{logo}}" class="logo" onerror="this.style.display='none'"/>
</div>
<div class="slip-title"><h2>PAY SLIP</h2><span style="color:#555;font-size:13px">For the month of <strong>{{month_name}} {{year}}</strong></span></div>
<div class="emp-grid">
  <div><div class="ei-label">Employee Name</div><div class="ei-val">{{employee_name}}</div></div>
  <div><div class="ei-label">Employee Code</div><div class="ei-val">{{employee_code}}</div></div>
  <div><div class="ei-label">Designation</div><div class="ei-val">{{designation}}</div></div>
  <div><div class="ei-label">Department</div><div class="ei-val">{{department}}</div></div>
  <div><div class="ei-label">Date of Joining</div><div class="ei-val">{{joining_date}}</div></div>
  <div><div class="ei-label">Pay Period</div><div class="ei-val">{{month_name}} {{year}}</div></div>
  <div><div class="ei-label">PAN Number</div><div class="ei-val">{{pan_number}}</div></div>
  <div><div class="ei-label">Bank Account</div><div class="ei-val">{{bank_account_number}}</div></div>
</div>
<div class="cols">
  <div class="section">
    <div class="sh sh-earn">Earnings</div>
    <table>
      <tr><td>Basic Salary</td><td>₹{{basic_salary}}</td></tr>
      <tr><td>HRA</td><td>₹{{hra}}</td></tr>
      <tr><td>Transport Allowance</td><td>₹{{transport_allowance}}</td></tr>
      <tr><td>Medical Allowance</td><td>₹{{medical_allowance}}</td></tr>
      <tr><td>Special Allowance</td><td>₹{{special_allowance}}</td></tr>
      <tr class="tot"><td>Gross Salary</td><td>₹{{gross_salary}}</td></tr>
    </table>
  </div>
  <div class="section">
    <div class="sh sh-ded">Deductions</div>
    <table>
      <tr><td>Provident Fund</td><td>₹{{pf_deduction}}</td></tr>
      <tr><td>Professional Tax</td><td>₹{{professional_tax}}</td></tr>
      <tr><td>TDS</td><td>₹{{tds}}</td></tr>
      <tr><td>Other Deductions</td><td>₹{{other_deductions}}</td></tr>
      <tr class="tot-d"><td>Total Deductions</td><td>₹{{total_deductions}}</td></tr>
    </table>
  </div>
</div>
<div class="net">
  <div><div class="net-label">Net Salary Payable</div><div style="font-size:11px;opacity:.75;margin-top:3px">{{month_name}} {{year}}</div></div>
  <div class="net-amt">₹{{net_salary}}</div>
</div>
<div class="sig-section">
  <div style="text-align:center">
    <img src="{{signature}}" class="sig-img" onerror="this.style.display='none'"/>
    <img src="{{stamp}}" class="stamp-img" onerror="this.style.display='none'"/>
    <p style="margin:0;font-size:13px"><strong>{{hr_name}}</strong><br/>{{hr_title}}<br/>{{company_name}}</p>
  </div>
</div>
<div class="footer">This is a computer-generated payslip and does not require a physical signature. | {{company_name}} | {{company_email}}</div>
</body></html>`;

const DEFAULTS: Record<string, string> = {
  offer_letter: DEFAULT_OFFER_LETTER,
  conditional_offer: DEFAULT_CONDITIONAL_OFFER,
  payslip: DEFAULT_PAYSLIP,
};

const TYPE_META: Record<string, { label: string; color: string; desc: string }> = {
  offer_letter: {
    label: "Offer Letter",
    color: "bg-violet-100 text-violet-700",
    desc: "Sent to selected candidates with employment terms and compensation.",
  },
  conditional_offer: {
    label: "Conditional Offer",
    color: "bg-amber-100 text-amber-700",
    desc: "Issued when the offer depends on background checks or document verification.",
  },
  payslip: {
    label: "Payslip",
    color: "bg-emerald-100 text-emerald-700",
    desc: "Monthly salary statement with earnings, deductions and net pay.",
  },
};

/* ─── Preview highlighted (placeholders shown as tags) ────────────── */
function highlightPlaceholders(html: string): string {
  return html.replace(
    /\{\{([^}]+)\}\}/g,
    (_, key) =>
      `<span style="background:#fef9c3;color:#92400e;padding:0 3px;border-radius:3px;font-size:11px;font-weight:600">{{${key}}}</span>`,
  );
}

/* ─── Template card ─────────────────────────────────────────────────── */
function TemplateCard({
  type,
  companyId,
}: {
  type: string;
  companyId: number;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState<string>("");
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fileName, setFileName] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const meta = TYPE_META[type];

  /* Load existing from API */
  useEffect(() => {
    fetch(`/api/document-templates?companyId=${companyId}`)
      .then(r => r.json())
      .then((templates: any[]) => {
        const found = templates.find((t: any) => t.type === type);
        if (found?.content) {
          setContent(found.content);
          setIsDefault(false);
          setFileName(found.name || "");
        } else {
          setContent(DEFAULTS[type] ?? "");
          setIsDefault(true);
        }
      })
      .catch(() => {
        setContent(DEFAULTS[type] ?? "");
        setIsDefault(true);
      })
      .finally(() => setLoading(false));
  }, [type, companyId]);

  /* Save to API */
  const save = useCallback(
    async (newContent: string, name: string) => {
      setSaving(true);
      try {
        const r = await fetch(`/api/document-templates/${type}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, name, content: newContent }),
        });
        if (!r.ok) throw new Error();
        toast({ title: `${meta.label} template saved` });
      } catch {
        toast({ title: "Save failed", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    },
    [companyId, type, meta.label],
  );

  /* Handle file */
  const handleFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const isHtml = name.endsWith(".html") || name.endsWith(".htm");
    const isDocx = name.endsWith(".docx") || name.endsWith(".doc");
    const isPdf = name.endsWith(".pdf");

    if (!isHtml && !isDocx && !isPdf) {
      toast({ title: "Unsupported file type", description: "Please upload a .docx, .doc, .pdf or .html file.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let html = "";
      if (isHtml) {
        html = await file.text();
      } else if (isDocx) {
        toast({ title: "Converting Word document…", description: "This may take a few seconds." });
        const buf = await file.arrayBuffer();
        html = await convertDocxToHtml(buf);
      } else if (isPdf) {
        toast({ title: "Rendering PDF pages…", description: "This may take a few seconds." });
        const buf = await file.arrayBuffer();
        html = await convertPdfToHtml(buf);
      }
      setContent(html);
      setIsDefault(false);
      setFileName(file.name);
      await save(html, file.name);
    } catch (err) {
      console.error(err);
      toast({ title: "Conversion failed", description: "Could not read the file. Try saving as HTML from Word/Docs.", variant: "destructive" });
      setSaving(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const useDefault = async () => {
    const def = DEFAULTS[type] ?? "";
    setContent(def);
    setIsDefault(true);
    setFileName("");
    await save(def, meta.label + " (Default)");
  };

  const clearTemplate = async () => {
    const def = DEFAULTS[type] ?? "";
    setContent(def);
    setIsDefault(true);
    setFileName("");
    await save(def, meta.label + " (Default)");
  };

  const preview = () => {
    const win = window.open("", "_blank", "width=880,height=950");
    if (!win) return;
    win.document.write(highlightPlaceholders(content));
    win.document.close();
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-56">
        <Loader2 className="animate-spin w-6 h-6 text-primary" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {meta.label}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">{meta.desc}</CardDescription>
          </div>
          <Badge className={`text-xs shrink-0 ${meta.color} border-0`}>
            {isDefault ? "Built-in" : "Custom"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        {/* Preview thumbnail */}
        <div className="relative border rounded-lg overflow-hidden bg-white" style={{ height: 200 }}>
          <iframe
            srcDoc={content}
            title={`${meta.label} preview`}
            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
            style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", height: "222%" }}
            sandbox="allow-same-origin"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60 pointer-events-none" />
          {!isDefault && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-white/90 text-gray-700 text-xs border shadow-sm gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {fileName || "Custom template"}
              </Badge>
            </div>
          )}
        </div>

        {/* Upload zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-5 cursor-pointer text-center transition-colors flex flex-col items-center gap-2 ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Upload your template</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drop a <code className="bg-muted px-1 rounded">.docx</code>, <code className="bg-muted px-1 rounded">.pdf</code> or <code className="bg-muted px-1 rounded">.html</code> file here or click to browse
            </p>
          </div>
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />Saving…
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".docx,.doc,.pdf,.html,.htm" className="hidden" onChange={onInputChange} />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={preview}>
            <Eye className="w-3.5 h-3.5" />Preview
          </Button>
          {!isDefault ? (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearTemplate}>
              <X className="w-3.5 h-3.5" />Remove custom
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={useDefault}>
              <RotateCcw className="w-3.5 h-3.5" />Reset default
            </Button>
          )}
        </div>

        {/* Info callout */}
        <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/60" />
          <span>
            Your logo, letterhead, stamp and signature from <strong>Doc Settings</strong> are automatically
            injected via <code>{"{{logo}}"}</code>, <code>{"{{signature}}"}</code> etc. No need to embed them in the file.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Placeholder reference panel ──────────────────────────────────── */
function PlaceholderReference() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p className="font-semibold text-sm">Placeholder Reference</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use these <code>{"{{tags}}"}</code> in your HTML template — they're replaced with real data when generating documents.
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 border-t pt-4">
            {PLACEHOLDER_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map(([ph, desc]) => (
                    <div
                      key={ph}
                      className="flex flex-col text-xs border rounded p-1.5 hover:bg-primary/5 cursor-pointer"
                      onClick={() => { navigator.clipboard.writeText(ph); }}
                      title="Click to copy"
                    >
                      <code className="text-primary font-mono">{ph}</code>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Click any tag to copy it to clipboard.</p>
        </CardContent>
      )}
    </Card>
  );
}

/* ─── How to create a template guide ───────────────────────────────── */
function HowToGuide() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-dashed">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <p className="font-semibold text-sm">How to create your own template</p>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <CardContent className="pt-0 border-t">
          <ol className="text-sm text-muted-foreground space-y-3 mt-4 list-decimal list-inside">
            <li>
              <strong>Design your document</strong> in Microsoft Word, Google Docs, or any HTML editor — matching your company letterhead style.
            </li>
            <li>
              <strong>Add placeholders</strong> where employee/company data should appear, e.g. write <code className="bg-muted px-1 rounded">{"{{employee_name}}"}</code> where the name should print.
            </li>
            <li>
              <strong>Leave out the logo, stamp and signature</strong> — place <code className="bg-muted px-1 rounded">{"{{logo}}"}</code>,{" "}
              <code className="bg-muted px-1 rounded">{"{{stamp}}"}</code> and{" "}
              <code className="bg-muted px-1 rounded">{"{{signature}}"}</code> tags instead. They're pulled from <em>Doc Settings</em> automatically.
            </li>
            <li>
              <strong>Save as HTML</strong> — in Word: <em>File → Save as → Web Page (.html)</em>. In Google Docs: <em>File → Download → Web Page (.html)</em>.
            </li>
            <li>
              <strong>Upload the .html file</strong> above. The system will render a live preview and save it for use in document generation.
            </li>
          </ol>
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function DocumentTemplates() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload your organisation's own template files. Brand assets (logo, letterhead, stamp, signature) are injected automatically.
          </p>
        </div>

        {/* Template cards */}
        {companyId ? (
          <div className="grid gap-5 md:grid-cols-3">
            {["offer_letter", "conditional_offer", "payslip"].map(type => (
              <TemplateCard key={type} type={type} companyId={companyId} />
            ))}
          </div>
        ) : (
          <Card className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading…
          </Card>
        )}

        {/* Placeholder reference (collapsible) */}
        <PlaceholderReference />

        {/* How-to guide (collapsible) */}
        <HowToGuide />
      </div>
    </DashboardLayout>
  );
}
