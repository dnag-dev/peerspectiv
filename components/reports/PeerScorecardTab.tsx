"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScorecardRow {
  peer_id: string;
  full_name: string;
  cases_reviewed: number;
  avg_turnaround_days: number | null;
  ai_agreement_pct: number | null;
  quality_score: number | null;
  avg_minutes_per_chart: number | null;
  earnings: number;
}

function ytdStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PeerScorecardTab() {
  const [periodStart, setPeriodStart] = useState(ytdStart());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        period_start: periodStart,
        period_end: periodEnd,
      });
      const res = await fetch(`/api/reports/peer-scorecard?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as { data: ScorecardRow[] };
      setRows(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generatePdf = useCallback(async () => {
    setGenerating(true);
    try {
      // Render via the PDF generate route by importing the renderer dynamically
      // through a server endpoint. Since there's no scorecard route in /generate,
      // use jspdf inline as a quick path.
      const { default: jsPDF } = await import("jspdf");
      const autoTableModule: any = await import("jspdf-autotable");
      const autoTable = autoTableModule.default ?? autoTableModule;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Reviewer Scorecard", 14, 18);
      doc.setFontSize(10);
      doc.text(`Period: ${periodStart} — ${periodEnd}`, 14, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31);
      autoTable(doc, {
        startY: 36,
        head: [
          [
            "Reviewer",
            "Cases",
            "Turnaround (d)",
            "AI Agreement %",
            "Quality",
            "Min/Chart",
            "Earnings",
          ],
        ],
        body: rows.map((r) => [
          r.full_name,
          r.cases_reviewed,
          r.avg_turnaround_days != null ? r.avg_turnaround_days.toFixed(1) : "—",
          r.ai_agreement_pct != null ? `${r.ai_agreement_pct.toFixed(1)}%` : "—",
          r.quality_score != null ? r.quality_score.toFixed(1) : "—",
          r.avg_minutes_per_chart != null ? r.avg_minutes_per_chart.toFixed(1) : "—",
          `$${r.earnings.toFixed(2)}`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 77, 183] },
        styles: { fontSize: 9 },
      });
      doc.save(`reviewer-scorecard-${periodStart}-to-${periodEnd}.pdf`);
    } finally {
      setGenerating(false);
    }
  }, [rows, periodStart, periodEnd]);

  const exportCsv = useCallback(() => {
    const url = `/api/reports/peer-scorecard/csv?period_start=${periodStart}&period_end=${periodEnd}`;
    window.location.href = url;
  }, [periodStart, periodEnd]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="ps">Period Start</Label>
          <Input
            id="ps"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe">Period End</Label>
          <Input
            id="pe"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={load} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={generatePdf}
            disabled={generating || rows.length === 0}
            className="w-full"
          >
            <FileText className="h-4 w-4" />
            {generating ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-critical-600 bg-critical-100 p-3 text-sm text-critical-700">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead className="text-right">Cases</TableHead>
              <TableHead className="text-right">Turnaround (d)</TableHead>
              <TableHead className="text-right">AI Agreement %</TableHead>
              <TableHead className="text-right">Quality</TableHead>
              <TableHead className="text-right">Min/Chart</TableHead>
              <TableHead className="text-right">Earnings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  {loading ? "Loading..." : "No reviewer data for this period."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.peer_id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-right">{r.cases_reviewed}</TableCell>
                  <TableCell className="text-right">
                    {r.avg_turnaround_days != null ? r.avg_turnaround_days.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.ai_agreement_pct != null ? `${r.ai_agreement_pct.toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.quality_score != null ? r.quality_score.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.avg_minutes_per_chart != null ? r.avg_minutes_per_chart.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="text-right">${r.earnings.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
