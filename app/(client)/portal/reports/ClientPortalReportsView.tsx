"use client";

import { useState } from "react";
import { Download, Loader2, FileText } from "lucide-react";

const TEMPLATES = [
  { key: "provider_highlights", label: "Provider Highlights", description: "Per-provider scores broken out by review type." },
  { key: "specialty_highlights", label: "Specialty Highlights", description: "Aggregate scores grouped by specialty." },
  { key: "question_analytics", label: "Question Analytics", description: "Yes / No / NA distribution per criterion with non-respondents." },
] as const;

interface Props {
  companyId: string;
  companyName: string;
}

export function ClientPortalReportsView({ companyId, companyName }: Props) {
  const today = new Date();
  const ninetyAgo = new Date(today.getTime() - 90 * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const [templateKey, setTemplateKey] = useState<string>("provider_highlights");
  const [rangeStart, setRangeStart] = useState(fmt(ninetyAgo));
  const [rangeEnd, setRangeEnd] = useState(fmt(today));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, companyId, rangeStart, rangeEnd }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || j.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Generate Report</h1>
        <p className="text-sm text-ink-secondary">{companyName} · download a PDF for your records or board review.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {TEMPLATES.map((t) => {
          const active = t.key === templateKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTemplateKey(t.key)}
              className={`text-left rounded-lg border p-4 transition-shadow ${
                active
                  ? "bg-surface-card border-status-info-dot shadow-md"
                  : "bg-surface-card border-border-subtle hover:shadow"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className={`h-5 w-5 ${active ? "text-status-info-dot" : "text-ink-secondary"}`} />
                <span className="font-medium text-ink-primary">{t.label}</span>
              </div>
              <p className="text-xs text-ink-secondary mt-1">{t.description}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-surface-card border border-border-subtle shadow-sm p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-secondary">Range Start</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-secondary">Range End</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-sm"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>
        </div>

        {err && (
          <p className="text-sm text-status-danger-fg bg-critical-50 px-3 py-2 rounded">{err}</p>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-cobalt-600 px-4 py-2 text-sm font-medium text-ink-primary hover:bg-cobalt-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Generate &amp; Download
        </button>
      </div>
    </div>
  );
}
