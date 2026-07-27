import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Image, Stamp, PenLine, FileImage, Save, Loader2, X } from "lucide-react";

type Settings = {
  logo?: string | null;
  letterhead?: string | null;
  stamp?: string | null;
  signature?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  hrName?: string | null;
  hrTitle?: string | null;
};

function UploadZone({
  label, icon: Icon, value, onChange, description,
}: { label: string; icon: any; value?: string | null; onChange: (v: string | null) => void; description: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground -mt-1">{description}</p>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors relative group min-h-[120px] flex flex-col items-center justify-center gap-2"
      >
        {value ? (
          <>
            <img src={value} alt={label} className="max-h-20 max-w-full object-contain rounded" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            <span className="text-xs text-muted-foreground">Click to replace</span>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Click to upload {label.toLowerCase()}</span>
            <span className="text-xs text-muted-foreground">PNG, JPG or SVG</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function DocumentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const companyId = (user as any)?.companyId;
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/document-settings?companyId=${companyId}`)
      .then(r => r.json())
      .then(d => { if (d) setSettings(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/document-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...settings }),
      });
      if (!r.ok) throw new Error();
      toast({ title: "Settings saved", description: "Your document settings have been updated." });
    } catch {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof Settings) => (v: string | null) => setSettings(s => ({ ...s, [key]: v }));
  const setField = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings(s => ({ ...s, [key]: e.target.value }));

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">Upload your organisation's brand assets used on all generated documents.</p>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Brand Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Assets</CardTitle>
              <CardDescription>Used on headers, footers, and signatures of all documents.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <UploadZone label="Company Logo" icon={Image} value={settings.logo} onChange={set("logo")} description="Shown top-left on documents" />
              <UploadZone label="Letterhead" icon={FileImage} value={settings.letterhead} onChange={set("letterhead")} description="Background / header image" />
              <UploadZone label="Official Stamp" icon={Stamp} value={settings.stamp} onChange={set("stamp")} description="Shown beside signature" />
              <UploadZone label="Authorised Signature" icon={PenLine} value={settings.signature} onChange={set("signature")} description="HR or Director signature" />
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>Printed on document headers and footers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input value={settings.companyName ?? ""} onChange={setField("companyName")} placeholder="TxSprint Technologies Pvt. Ltd." />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={settings.companyAddress ?? ""} onChange={setField("companyAddress")} placeholder="123 Business Park, Mumbai, 400001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={settings.companyPhone ?? ""} onChange={setField("companyPhone")} placeholder="+91 9800000000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={settings.companyEmail ?? ""} onChange={setField("companyEmail")} placeholder="hr@company.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={settings.companyWebsite ?? ""} onChange={setField("companyWebsite")} placeholder="https://company.com" />
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">HR Signatory</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={settings.hrName ?? ""} onChange={setField("hrName")} placeholder="Priya Sharma" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={settings.hrTitle ?? ""} onChange={setField("hrTitle")} placeholder="Head of People & Culture" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
