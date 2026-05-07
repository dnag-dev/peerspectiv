"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export interface QuestionRow {
  field_label: string;
  default_answer: string | null;
  peer_answer: string | null;
  score: 100 | 0 | null;
  excluded: boolean;
  comment?: string | null;
}

interface Props {
  questions: QuestionRow[];
  totalMeasuresMetPct: number | null;
  numerator: number;
  denominator: number;
  generalComments?: string | null;
  resultId?: string;
}

function scoreCell(score: 100 | 0 | null, excluded: boolean) {
  if (excluded) return <span className="text-xs text-ink-tertiary">Excluded</span>;
  if (score === 100) return <span className="text-xs font-medium text-status-success-fg">100</span>;
  if (score === 0) return <span className="text-xs font-medium text-status-danger-fg">0</span>;
  return <span className="text-xs text-ink-tertiary">—</span>;
}

function formatAnswer(answer: string | null): string {
  if (answer == null) return "—";
  if (answer === "true" || answer === "yes" || answer === "Yes") return "Yes";
  if (answer === "false" || answer === "no" || answer === "No") return "No";
  if (answer === "na" || answer === "NA" || answer === "N/A") return "N/A";
  return answer;
}

function formatDefault(def: string | null): string {
  if (!def) return "—";
  if (def === "yes") return "Yes";
  if (def === "no") return "No";
  if (def === "na") return "N/A";
  return def;
}

export function ReviewAnswersTable({
  questions,
  totalMeasuresMetPct,
  numerator,
  denominator,
  generalComments,
  resultId,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    if (!resultId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/generate/per_provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_id: resultId }),
      });
      if (!res.ok) throw new Error(`PDF generation failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `review-report-${resultId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Score summary */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-eyebrow text-ink-secondary">Total Measures Met</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-ink-primary">
              {totalMeasuresMetPct != null ? `${totalMeasuresMetPct}%` : "—"}
            </span>
            <span className="text-xs text-ink-tertiary">
              ({numerator}/{denominator} questions)
            </span>
          </div>
        </div>
        {resultId && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-card px-3 py-1.5 text-xs font-medium text-ink-primary transition hover:bg-surface-muted disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download PDF
          </button>
        )}
      </div>

      {/* Questions table */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-ink-50 text-xs uppercase tracking-wider text-ink-secondary">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Question</th>
              <th className="px-3 py-2 text-center">Default</th>
              <th className="px-3 py-2 text-center">Your Answer</th>
              <th className="px-3 py-2 text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr
                key={i}
                className={`border-b border-border-subtle ${
                  i % 2 === 0 ? "bg-white" : "bg-ink-50/30"
                }`}
              >
                <td className="px-3 py-2 text-xs text-ink-tertiary">{i + 1}</td>
                <td className="px-3 py-2">
                  <div className="text-sm text-ink-primary">{q.field_label}</div>
                  {q.comment && (
                    <div className="mt-0.5 text-xs italic text-ink-secondary">
                      {q.comment}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-xs text-ink-secondary">
                  {formatDefault(q.default_answer)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`text-xs font-medium ${
                      q.excluded
                        ? "text-ink-tertiary"
                        : q.score === 100
                          ? "text-status-success-fg"
                          : q.score === 0
                            ? "text-status-danger-fg"
                            : "text-ink-primary"
                    }`}
                  >
                    {formatAnswer(q.peer_answer)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">{scoreCell(q.score, q.excluded)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* General comments */}
      {generalComments && (
        <div className="rounded-lg border border-border-subtle bg-surface-card p-4">
          <div className="text-eyebrow text-ink-secondary">Peer Comments</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
            {generalComments}
          </p>
        </div>
      )}
    </div>
  );
}
