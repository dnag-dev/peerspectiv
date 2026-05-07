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

function formatAnswer(answer: string | null): string {
  if (answer == null) return "—";
  if (answer === "true" || answer === "yes" || answer === "Yes") return "Yes";
  if (answer === "false" || answer === "no" || answer === "No") return "No";
  if (answer === "na" || answer === "NA" || answer === "N/A") return "N/A";
  return answer;
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
      {/* Score summary + Download */}
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

      {/* Questions — numbered list matching the old system's PDF format */}
      <div className="rounded-lg border border-border-subtle bg-surface-card p-4">
        <ol className="space-y-3">
          {questions.map((q, i) => {
            const answer = formatAnswer(q.peer_answer);
            const isNo = answer === "No";
            return (
              <li key={i} className="text-sm text-ink-primary">
                <div>
                  <span className="text-ink-secondary">{i + 1}. </span>
                  {q.field_label}
                  {!q.excluded && (
                    <span
                      className={`ml-1 font-semibold ${
                        isNo ? "text-status-danger-fg" : "text-ink-primary"
                      }`}
                    >
                      {answer}
                    </span>
                  )}
                  {q.excluded && (
                    <span className="ml-1 text-ink-tertiary italic">{answer || "—"}</span>
                  )}
                </div>
                {q.comment && isNo && (
                  <div className="mt-1 ml-4 text-xs text-ink-secondary">
                    <span className="font-medium">Additional Response:</span>{" "}
                    {q.comment}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
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
