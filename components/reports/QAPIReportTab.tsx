"use client";

import { useState, useCallback } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  companies: Pick<Company, "id" | "name">[];
}

interface QAPIReport {
  narrative: string;
  company_name: string;
  period: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan - Mar)" },
  { value: "Q2", label: "Q2 (Apr - Jun)" },
  { value: "Q3", label: "Q3 (Jul - Sep)" },
  { value: "Q4", label: "Q4 (Oct - Dec)" },
] as const;

const QUARTER_DATES: Record<string, { start: string; end: string }> = {
  Q1: { start: "-01-01", end: "-03-31" },
  Q2: { start: "-04-01", end: "-06-30" },
  Q3: { start: "-07-01", end: "-09-30" },
  Q4: { start: "-10-01", end: "-12-31" },
};

function yearOptions(): string[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(current - i));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QAPIReportTab({ companies }: Props) {
  // Radix Select disallows empty-string values; use undefined until picked.
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [quarter, setQuarter] = useState<string | undefined>(undefined);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<QAPIReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = companyId && quarter && year;

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const dates = QUARTER_DATES[quarter!];
      const start_date = `${year}${dates.start}`;
      const end_date = `${year}${dates.end}`;

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, start_date, end_date }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }

      const json = (await res.json()) as { report: { narrative: string } };
      const company = companies.find((c) => c.id === companyId);

      setReport({
        narrative: json.report.narrative,
        company_name: company?.name ?? "Unknown",
        period: `${quarter} ${year}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [canGenerate, companyId, quarter, year, companies]);

  const downloadPdf = useCallback(async () => {
    if (!report) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("QAPI Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Company: ${report.company_name}`, 14, 30);
    doc.text(`Period: ${report.period}`, 14, 37);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

    doc.setDrawColor(200);
    doc.line(14, 49, 196, 49);

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(report.narrative, 175);
    doc.text(lines, 14, 56);

    doc.save(`qapi-report-${report.period.replace(/\s/g, "-").toLowerCase()}.pdf`);
  }, [report]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Company</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
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

        <div className="space-y-1.5">
          <Label>Quarter</Label>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger>
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions().map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            onClick={generate}
            disabled={!canGenerate || loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-blue" />
              <p className="mt-3 text-sm text-muted-foreground">
                AI is generating your QAPI report. This may take a moment...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {report.company_name} &mdash; {report.period}
            </h3>
            <Button variant="outline" size="sm" onClick={downloadPdf}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>

          <Card className="print:border-0 print:shadow-none">
            <CardContent className="prose prose-sm max-w-none p-6">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {report.narrative}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
