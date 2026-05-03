"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, RefreshCcw, Trash2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SavedReport {
  id: string;
  companyId: string | null;
  templateKey: string;
  reportName: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  filters: any;
  createdBy: string | null;
  createdAt: string | Date | null;
}

const TEMPLATE_LABEL: Record<string, string> = {
  qapi: "QAPI Report",
  assignment_results: "Assignment Results",
  invoice: "Invoice",
  question_analytics: "Question Analytics",
  reviewer_scorecard: "Peer Scorecard",
};

export function SavedReportsTab({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const companyName = (id: string | null) =>
    companies.find((c) => c.id === id)?.name ?? "—";

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/reports/saved");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setRows(j.savedReports ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved report?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/reports/saved/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRerunPdf(r: SavedReport) {
    if (!r.companyId) {
      alert("This saved report has no company — cannot regenerate PDF.");
      return;
    }
    setBusy(r.id);
    try {
      const body: any = {
        templateKey: r.templateKey,
        companyId: r.companyId,
        rangeStart: r.rangeStart,
        rangeEnd: r.rangeEnd,
        filters: r.filters,
      };
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      const url = j.pdfUrl || j.url;
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${r.reportName}.pdf`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Report regenerated. Check the PDF Generator tab for output.");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-ink-900">
          <BookmarkCheck className="h-5 w-5 text-cobalt-600" />
          Saved Reports
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="h-7 text-xs"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCcw className="h-3 w-3 mr-1" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {err && (
          <p className="px-4 py-3 text-sm text-critical-700 bg-critical-50">{err}</p>
        )}
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Template</th>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Range</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-500">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-ink-400" />
                  No saved reports yet. Generate one from the QAPI or PDF
                  Generator tab.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-ink-100 hover:bg-ink-50/50"
              >
                <td className="px-4 py-3 font-medium text-ink-900">
                  {r.reportName}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {TEMPLATE_LABEL[r.templateKey] ?? r.templateKey}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {companyName(r.companyId)}
                </td>
                <td className="px-4 py-3 text-ink-600 text-xs">
                  {r.rangeStart && r.rangeEnd
                    ? `${r.rangeStart} → ${r.rangeEnd}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-ink-500 text-xs">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRerunPdf(r)}
                    disabled={busy === r.id}
                    className="h-7 text-xs"
                  >
                    {busy === r.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Re-run"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(r.id)}
                    disabled={busy === r.id}
                    className="h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
