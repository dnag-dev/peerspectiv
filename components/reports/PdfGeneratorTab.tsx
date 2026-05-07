"use client";

import { useState } from "react";
import { Download, Loader2, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company } from "@/types";

interface Props {
  companies: Pick<Company, "id" | "name">[];
}

type Need = "company" | "range" | "period";
const TEMPLATES: Array<{ key: string; label: string; needs: Need[] }> = [
  { key: "provider_highlights", label: "Provider Highlights", needs: ["company", "range"] },
  { key: "specialty_highlights", label: "Specialty Highlights", needs: ["company", "range"] },
  { key: "question_analytics", label: "Question Analytics", needs: ["company", "range"] },
  { key: "quality_certificate", label: "Quality Certificate", needs: ["company", "period"] },
];

export function PdfGeneratorTab({ companies }: Props) {
  const [templateKey, setTemplateKey] = useState<string>("provider_highlights");
  const [companyId, setCompanyId] = useState<string>("");
  const today = new Date();
  const ninetyAgo = new Date(today.getTime() - 90 * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const [rangeStart, setRangeStart] = useState(fmt(ninetyAgo));
  const [rangeEnd, setRangeEnd] = useState(fmt(today));
  const [period, setPeriod] = useState("Q1 2026");
  const [reportName, setReportName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tpl = TEMPLATES.find((t) => t.key === templateKey)!;

  function suggestedFilename(key: string) {
    return `${key}-${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  function downloadFromUrl(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    // For absolute URLs (saved-report blob), also try to open inline as fallback
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function generate(saveFirst: boolean) {
    setError(null);
    if (!companyId) {
      setError("Select a company");
      return;
    }
    setBusy(true);
    try {
      let savedReportId: string | null = null;
      if (saveFirst) {
        if (!reportName.trim()) {
          setError("Enter a report name to save");
          setBusy(false);
          return;
        }
        const sres = await fetch("/api/reports/saved", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-user-id": "admin-demo",
          },
          body: JSON.stringify({
            companyId,
            templateKey,
            reportName: reportName.trim(),
            rangeStart: tpl.needs.includes("range") ? rangeStart : null,
            rangeEnd: tpl.needs.includes("range") ? rangeEnd : null,
            filters: tpl.needs.includes("period") ? { period } : null,
          }),
        });
        const sjson = await sres.json();
        if (!sres.ok) throw new Error(sjson.error || "Save failed");
        savedReportId = sjson.savedReport?.id ?? null;
      }

      const body: Record<string, any> = {
        templateKey,
        companyId,
      };
      if (tpl.needs.includes("range")) {
        body.rangeStart = rangeStart;
        body.rangeEnd = rangeEnd;
      }
      if (tpl.needs.includes("period")) body.period = period;
      if (savedReportId) body.savedReportId = savedReportId;

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "admin-demo",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || j.error || `HTTP ${res.status}`);
      }

      if (savedReportId) {
        // saved-report flow returns JSON with pdfUrl
        const j = await res.json();
        if (j.pdfUrl) downloadFromUrl(j.pdfUrl, suggestedFilename(templateKey));
        else alert("Report saved. Run generated.");
      } else {
        const blob = await res.blob();
        // Pull filename from Content-Disposition if server set it
        const cd = res.headers.get("content-disposition") || "";
        const fnMatch = cd.match(/filename="?([^";]+)"?/i);
        const filename = fnMatch?.[1] || suggestedFilename(templateKey);
        const url = URL.createObjectURL(blob);
        downloadFromUrl(url, filename);
        // Revoke after the click has fired
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink-primary">
          <FileText className="h-5 w-5 text-status-info-dot" />
          Generate PDF Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Template</Label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {tpl.needs.includes("range") && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Range Start</Label>
              <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </div>
            <div>
              <Label>Range End</Label>
              <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
          </div>
        )}

        {tpl.needs.includes("period") && (
          <div>
            <Label>Period (e.g. Q1 2026)</Label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
        )}

        <div>
          <Label>Save as (optional)</Label>
          <Input
            placeholder="e.g. Q1 Provider Highlights"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-status-danger-fg bg-critical-50 px-3 py-2 rounded">{error}</p>
        )}

        <div className="flex gap-2">
          <Button onClick={() => generate(false)} disabled={busy} className="bg-cobalt-600 hover:bg-cobalt-700">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Generate &amp; Download
          </Button>
          <Button
            variant="outline"
            onClick={() => generate(true)}
            disabled={busy || !reportName.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Save &amp; Generate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
