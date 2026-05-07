"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Loader2, Package } from "lucide-react";

interface ReportDef {
  key: string;
  title: string;
  description: string;
  icon: "pdf" | "csv";
}

const REPORTS: ReportDef[] = [
  {
    key: "exec_summary",
    title: "Q1 Executive Summary PDF",
    description: "High-level compliance snapshot for the executive team",
    icon: "pdf",
  },
  {
    key: "full_data_csv",
    title: "Full Data Export CSV",
    description: "All review cases, scores, and deficiencies",
    icon: "csv",
  },
  {
    key: "provider_perf",
    title: "Provider Performance Report PDF",
    description: "Per-provider scores and trends",
    icon: "pdf",
  },
  {
    key: "corrective_status",
    title: "Corrective Action Status Report PDF",
    description: "Open, in-progress, and completed actions",
    icon: "pdf",
  },
  {
    key: "hrsa_summary",
    title: "HRSA Compliance Summary PDF",
    description: "Regulatory-ready compliance summary",
    icon: "pdf",
  },
];

export function ExportGrid({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  // Default to the most recently completed quarter.
  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
  const defaultQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const defaultYear = currentQuarter === 1 ? today.getFullYear() - 1 : today.getFullYear();
  const [quarter, setQuarter] = useState<number>(defaultQuarter);
  const [year, setYear] = useState<number>(defaultYear);

  const handleDownloadAll = async () => {
    setBulkBusy(true);
    setBulkStatus(null);
    try {
      const res = await fetch("/api/reports/export-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, year, quarter }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      const files: Array<{ name: string; url: string; method: string; body: any }> =
        j.files ?? [];
      let succeeded = 0;
      let failed = 0;
      for (const f of files) {
        setBulkStatus(`Generating ${f.name}…`);
        try {
          const r = await fetch(f.url, {
            method: f.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f.body),
          });
          if (!r.ok) {
            failed++;
            continue;
          }
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = f.name;
          a.click();
          URL.revokeObjectURL(url);
          succeeded++;
          // Small delay so the browser doesn't drop rapid clicks.
          await new Promise((res) => setTimeout(res, 250));
        } catch {
          failed++;
        }
      }
      setBulkStatus(
        `Done — ${succeeded} downloaded${failed ? `, ${failed} failed` : ""}`
      );
    } catch (e) {
      setBulkStatus(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDownload = async (key: string, title: string) => {
    setBusy(key);
    try {
      const res = await fetch(
        `/api/reports/data?company_id=${companyId}&kind=${key}`
      );
      const payload = await res.json();

      if (key === "full_data_csv") {
        downloadCsv(payload, `${sanitize(companyName)}-full-export.csv`);
      } else {
        await generatePdf(key, title, companyName, payload);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate report.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk download row */}
      <div
        className="rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3"
        style={{ backgroundColor: "#0F2040" }}
      >
        <Package className="h-6 w-6 text-ink-primary shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium text-ink-primary">
            Download everything for one quarter
          </div>
          <div className="text-xs text-ink-tertiary">
            Provider highlights, specialty highlights, question analytics, and the quality certificate — one click.
          </div>
        </div>
        <select
          value={quarter}
          onChange={(e) => setQuarter(Number(e.target.value))}
          disabled={bulkBusy}
          className="rounded-md bg-white/10 text-ink-primary text-sm px-2 py-1.5 border border-white/20"
        >
          <option value={1}>Q1</option>
          <option value={2}>Q2</option>
          <option value={3}>Q3</option>
          <option value={4}>Q4</option>
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          disabled={bulkBusy}
          className="w-24 rounded-md bg-white/10 text-ink-primary text-sm px-2 py-1.5 border border-white/20"
        />
        <button
          onClick={handleDownloadAll}
          disabled={bulkBusy}
          className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-ink-primary disabled:opacity-50"
          style={{ backgroundColor: "#2563EB" }}
        >
          {bulkBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Working…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download all
            </>
          )}
        </button>
      </div>
      {bulkStatus && (
        <div className="text-xs text-ink-tertiary">{bulkStatus}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {REPORTS.map((r) => (
        <div
          key={r.key}
          className="rounded-lg p-5 flex flex-col"
          style={{ backgroundColor: 'var(--color-card)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            {r.icon === "csv" ? (
              <FileSpreadsheet className="h-8 w-8" style={{ color: "#22C55E" }} />
            ) : (
              <FileText className="h-8 w-8" style={{ color: "#2563EB" }} />
            )}
            <h3 className="text-sm font-medium text-ink-primary flex-1">{r.title}</h3>
          </div>
          <p className="text-xs text-ink-tertiary flex-1">{r.description}</p>
          <button
            onClick={() => handleDownload(r.key, r.title)}
            disabled={busy === r.key}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-ink-primary disabled:opacity-50"
            style={{ backgroundColor: "#2563EB" }}
          >
            {busy === r.key ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download
              </>
            )}
          </button>
        </div>
      ))}
      </div>
    </div>
  );
}

function sanitize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function downloadCsv(payload: any, filename: string) {
  const rows: any[] = payload?.rows ?? [];
  if (rows.length === 0) {
    alert("No data to export.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function generatePdf(
  kind: string,
  title: string,
  companyName: string,
  payload: any
) {
  const { jsPDF } = await import("jspdf");
  const autoTableModule: any = await import("jspdf-autotable");
  const autoTable = autoTableModule.default ?? autoTableModule;

  const doc = new jsPDF();
  const now = new Date().toLocaleDateString();

  doc.setFontSize(18);
  doc.setTextColor(15, 32, 64);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${companyName}  •  Generated ${now}`, 14, 27);

  let y = 35;

  if (kind === "exec_summary") {
    const { compliance, reviews, avgTurnaround, riskRate, repeats } = payload;
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("Executive Summary", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Compliance Score", `${compliance}%`],
        ["Reviews this quarter", String(reviews)],
        ["Avg turnaround", `${avgTurnaround} days`],
        ["Documentation risk rate", `${riskRate}%`],
        ["Repeat deficiency providers", String(repeats)],
      ],
      theme: "grid",
      headStyles: { fillColor: [46, 111, 232] },
    });
  } else if (kind === "provider_perf") {
    const providers = payload.providers ?? [];
    autoTable(doc, {
      startY: y,
      head: [["Provider", "Specialty", "Reviews", "Avg Score"]],
      body: providers.map((p: any) => [
        p.name,
        p.specialty,
        p.count,
        `${p.avg}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [46, 111, 232] },
    });
  } else if (kind === "corrective_status") {
    const actions = payload.actions ?? [];
    autoTable(doc, {
      startY: y,
      head: [["Title", "Status", "Progress", "Due"]],
      body: actions.map((a: any) => [
        a.title,
        a.status,
        `${a.progress}%`,
        a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: [46, 111, 232] },
    });
  } else if (kind === "hrsa_summary") {
    const { compliance, reviews, specialty, topMissed, narrative, hrsaMeasures } =
      payload;
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text(
      `Overall compliance: ${compliance}%   Total reviews: ${reviews}`,
      14,
      y
    );
    y += 6;

    if (narrative && typeof narrative === "string") {
      doc.setFontSize(10);
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(narrative, 180);
      doc.text(lines, 14, y);
      y += Math.min(lines.length * 5, 80) + 4;
    }

    if (Array.isArray(hrsaMeasures) && hrsaMeasures.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["HRSA Quality Measure", "Value", "Target", "Status"]],
        body: hrsaMeasures.map((m: any) => [
          m.measure,
          m.value,
          m.target,
          m.met ? "Met" : "Not met",
        ]),
        theme: "grid",
        headStyles: { fillColor: [46, 111, 232] },
      });
      y = (doc as any).lastAutoTable?.finalY ?? y + 30;
    }

    autoTable(doc, {
      startY: y + 6,
      head: [["Specialty", "Avg Compliance", "Reviews"]],
      body: (specialty ?? []).map((s: any) => [s.specialty, `${s.avg}%`, s.count]),
      theme: "grid",
      headStyles: { fillColor: [46, 111, 232] },
    });
    const after = (doc as any).lastAutoTable?.finalY ?? y + 30;
    autoTable(doc, {
      startY: after + 6,
      head: [["Top Missed Criteria", "Count"]],
      body: (topMissed ?? []).map((t: any) => [t.criterion, t.count]),
      theme: "grid",
      headStyles: { fillColor: [239, 68, 68] },
    });
  }

  doc.save(`${sanitize(companyName)}-${kind}.pdf`);
}
