"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReviewCase } from "@/types";
import StatusPill from "@/components/ui/StatusPill";
import KPICard from "@/components/ui/KPICard";
import { Download, Loader2 } from "lucide-react";

function DownloadPdfButton({ resultId }: { resultId: string }) {
  const [downloading, setDownloading] = useState(false);
  async function handleClick() {
    setDownloading(true);
    try {
      const res = await fetch("/api/reports/generate/per_provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_id: resultId }),
      });
      if (!res.ok) throw new Error(`PDF failed (${res.status})`);
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
    <button
      onClick={handleClick}
      disabled={downloading}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-surface-muted disabled:opacity-50"
    >
      {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      Download PDF Report
    </button>
  );
}

function daysUntilDue(date: string): number {
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface PeerPortalClientProps {
  cases: ReviewCase[];
  /** Current ?status= filter — drives the active state on the circles. */
  activeStatus?: string;
  /** Phase 2 — drill-down circles at the top. */
  counts?: {
    in_progress: number;
    completed: number;
    incomplete: number;
  };
}

// Drill-down KPI tile — replaces the bubble-circle row. Same data, cleaner shell.
const dotByTone: Record<string, string> = {
  warning: "bg-status-warning-dot",
  success: "bg-status-success-dot",
  info:    "bg-status-info-dot",
};
function KPITile({
  label,
  count,
  href,
  active,
  tone,
  sub,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
  tone: "warning" | "success" | "info";
  sub?: string;
}) {
  return (
    <Link
      href={href}
      data-testid="peer-status-circle"
      data-active={active ? "true" : "false"}
      className={cn(
        "block rounded-md border bg-surface-card p-3 transition hover:shadow-sm",
        active ? "border-brand" : "border-border-subtle"
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotByTone[tone])} />
        <span className="eyebrow">{label}</span>
      </div>
      <p className="display-number mb-0.5">{count}</p>
      {sub && <p className="text-2xs text-ink-tertiary">{sub}</p>}
    </Link>
  );
}

// Section F1: group cases by (provider_id, batch_period). Multi-chart pairs
// render a single card with a "N charts" badge linking to a tabbed detail page.
interface CaseGroup {
  key: string;
  providerId: string | null;
  batchPeriod: string | null;
  cases: ReviewCase[];
}

function groupCases(cases: ReviewCase[]): CaseGroup[] {
  const groups = new Map<string, CaseGroup>();
  for (const c of cases) {
    // Only group when BOTH a provider and a period label are present. Otherwise,
    // fall back to a per-case key so the card renders solo (current behavior).
    const period = c.batch_period || c.cadence_period_label;
    const groupable = c.provider_id && period;
    const key = groupable
      ? `${c.provider_id}::${period}`
      : `solo::${c.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.cases.push(c);
    } else {
      groups.set(key, {
        key,
        providerId: c.provider_id,
        batchPeriod: period ?? null,
        cases: [c],
      });
    }
  }
  return Array.from(groups.values());
}

export function PeerPortalClient({
  cases,
  activeStatus = "all",
  counts = { in_progress: 0, completed: 0, incomplete: 0 },
}: PeerPortalClientProps) {
  const [searchQ, setSearchQ] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const statusCircles = (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      <KPITile
        label="In progress"
        count={counts.in_progress}
        href="/peer/portal?status=in_progress"
        active={activeStatus === "in_progress" || activeStatus === "all"}
        tone="warning"
        sub="Assigned & actively reviewing"
      />
      <KPITile
        label="Completed"
        count={counts.completed}
        href="/peer/portal?status=completed"
        active={activeStatus === "completed"}
        tone="success"
        sub="Reviews submitted"
      />
      <KPITile
        label="Incomplete"
        count={counts.incomplete}
        href="/peer/portal?status=incomplete"
        active={activeStatus === "incomplete"}
        tone="info"
        sub="Past due — deadline passed"
      />
      {activeStatus !== "all" && (
        <Link
          href="/peer/portal"
          className="col-span-full text-xs text-brand underline hover:text-brand-hover"
        >
          Clear filter
        </Link>
      )}
    </div>
  );

  if (cases.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-ink-primary">My queue</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {activeStatus === "all"
              ? "No cases assigned"
              : `No cases match status: ${activeStatus.replace("_", " ")}`}
          </p>
        </div>
        {statusCircles}
        <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ink-100">
          <svg
            className="h-8 w-8 text-ink-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-medium tracking-tight text-ink-primary">
          No assigned cases
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          You have no cases in your queue. Check back later for new assignments.
        </p>
        </div>
      </div>
    );
  }

  const groups = groupCases(cases);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">My Queue</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {cases.length} case{cases.length !== 1 ? "s" : ""}
          {activeStatus === "all" ? " assigned to you" : ` matching status: ${activeStatus.replace("_", " ")}`}
        </p>
      </div>

      {statusCircles}

      {/* Search + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search provider, company, specialty..."
            className="w-full rounded-md border border-border-subtle bg-white py-2 pl-9 pr-3 text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex rounded-md border border-border-subtle">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 text-xs font-medium ${viewMode === "grid" ? "bg-brand text-white" : "text-ink-secondary hover:bg-ink-50"} rounded-l-md`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 text-xs font-medium ${viewMode === "list" ? "bg-brand text-white" : "text-ink-secondary hover:bg-ink-50"} rounded-r-md`}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-ink-50 text-xs uppercase text-ink-secondary">
              <tr>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Specialty</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">AI</th>
                <th className="px-4 py-3 text-left">Chart</th>
                <th className="px-4 py-3 text-left">Report</th>
              </tr>
            </thead>
            <tbody>
              {cases
                .filter((c) => {
                  if (!searchQ.trim()) return true;
                  const q = searchQ.toLowerCase();
                  const provider = c.provider ? `${c.provider.first_name} ${c.provider.last_name}`.toLowerCase() : "";
                  const company = c.company?.name?.toLowerCase() || "";
                  const spec = (c.specialty_required || "").toLowerCase();
                  return provider.includes(q) || company.includes(q) || spec.includes(q);
                })
                .map((c) => {
                  const provider = c.provider ? `${c.provider.first_name} ${c.provider.last_name}` : "—";
                  const days = c.due_date ? daysUntilDue(c.due_date) : null;
                  return (
                    <tr key={c.id} className="border-b border-border-subtle hover:bg-ink-50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/peer/cases/${c.id}`} className="text-brand hover:underline">{provider}</Link>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">{c.company?.name || "—"}</td>
                      <td className="px-4 py-3 text-ink-secondary">{c.specialty_required || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === "completed" ? "bg-green-100 text-green-700" :
                          c.status === "past_due" ? "bg-red-100 text-red-700" :
                          c.status === "assigned" || c.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {(c.status || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${days != null && days < 0 ? "text-red-600 font-medium" : "text-ink-secondary"}`}>
                        {days != null ? (days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">
                        {c.ai_analysis_status === "complete" ? "✓" : c.ai_analysis_status === "processing" ? "…" : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs truncate max-w-[150px]">
                        {c.chart_file_path ? (
                          <a href={c.chart_file_path} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                            {c.chart_file_name || "View chart"}
                          </a>
                        ) : (
                          <span className="text-ink-secondary">{c.chart_file_name || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.status === "completed" && c.review_result?.id ? (
                          <DownloadPdfButton resultId={c.review_result.id} />
                        ) : (
                          <span className="text-ink-tertiary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.filter((group) => {
          if (!searchQ.trim()) return true;
          const q = searchQ.toLowerCase();
          return group.cases.some((c) => {
            const provider = c.provider ? `${c.provider.first_name} ${c.provider.last_name}`.toLowerCase() : "";
            const company = c.company?.name?.toLowerCase() || "";
            const spec = (c.specialty_required || "").toLowerCase();
            return provider.includes(q) || company.includes(q) || spec.includes(q);
          });
        }).map((group) => {
          const isMulti = group.cases.length > 1;
          // Use the earliest due date for the group.
          const sortedByDue = [...group.cases].sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return (
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            );
          });
          const c = sortedByDue[0];
          const days = c.due_date ? daysUntilDue(c.due_date) : null;
          const isPastDue = days != null && days < 0;
          const isUrgent = days != null && days <= 2 && days >= 0;
          const anyInProgress = group.cases.some(
            (g) => g.status === "in_progress"
          );
          const anyAiReady = group.cases.some(
            (g) => g.ai_analysis_status === "complete"
          );
          const hasUrgentInGroup = group.cases.some(
            (g) => g.priority === "urgent"
          );
          const hasHighInGroup = group.cases.some((g) => g.priority === "high");
          const displayedPriority = hasUrgentInGroup
            ? "urgent"
            : hasHighInGroup
              ? "high"
              : "normal";

          const href =
            isMulti && group.providerId && group.batchPeriod
              ? `/peer/cases/group/${group.providerId}/${encodeURIComponent(
                  group.batchPeriod
                )}`
              : `/peer/cases/${c.id}`;

          return (
            <div
              key={group.key}
              data-testid="case-card"
              data-case-id={c.id}
              data-group-size={group.cases.length}
              className="group flex h-full flex-col rounded-md border border-border-subtle bg-surface-card p-4 transition hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-ink-primary">
                      {c.provider?.first_name} {c.provider?.last_name}
                    </h3>
                    {displayedPriority !== "normal" && (
                      <StatusPill variant={displayedPriority === "urgent" ? "danger" : "warning"}>
                        {displayedPriority}
                      </StatusPill>
                    )}
                    {isMulti && (
                      <StatusPill variant="info">
                        {group.cases.length} charts
                      </StatusPill>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-secondary">
                    {c.provider?.specialty ?? "General"} · {c.company?.name}
                    {group.batchPeriod ? ` · ${group.batchPeriod}` : ""}
                  </p>
                </div>
              </div>

              {c.status !== "completed" && c.due_date && (
                <div
                  className={cn(
                    "mt-3 text-xs font-medium",
                    isPastDue
                      ? "text-status-danger-dot"
                      : isUrgent
                        ? "text-status-warning-dot"
                        : "text-ink-secondary"
                  )}
                >
                  {isPastDue
                    ? `${Math.abs(days!)}d overdue`
                    : days === 0
                      ? "Due today"
                      : days === 1
                        ? "Due tomorrow"
                        : `Due ${formatShortDate(c.due_date)} (${days}d)`}
                  {isMulti && (
                    <span className="ml-1 text-ink-tertiary">(earliest)</span>
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center gap-1.5">
                <StatusPill
                  variant={
                    c.status === "completed" ? "success"
                    : c.status === "past_due" ? "danger"
                    : anyInProgress ? "warning"
                    : "neutral"
                  }
                >
                  {c.status === "completed" ? "Completed"
                    : c.status === "past_due" ? "Past due"
                    : anyInProgress ? "In progress"
                    : "Assigned"}
                </StatusPill>
                {c.status === "completed" && c.review_result?.overall_score != null && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      Number(c.review_result.overall_score) >= 80
                        ? "bg-mint-100 text-status-success-fg"
                        : Number(c.review_result.overall_score) >= 50
                          ? "bg-amber-100 text-status-warning-fg"
                          : "bg-critical-100 text-status-danger-fg"
                    }`}
                  >
                    {Math.round(Number(c.review_result.overall_score))}%
                  </span>
                )}
                {anyAiReady && c.status !== "completed" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEEDFE] px-2 py-0.5 text-2xs font-medium text-[#3C3489]">
                    AI ready
                  </span>
                )}
              </div>

              {/* mt-auto pins button to bottom — alignment fix across cards in a row */}
              <div className="mt-auto pt-4 space-y-2">
                <Link
                  href={href}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
                    c.status === "completed"
                      ? "border border-border-default bg-surface-card text-ink-primary hover:bg-surface-muted"
                      : anyAiReady
                        ? "bg-brand text-white hover:bg-brand-hover"
                        : "border border-border-default bg-surface-card text-ink-primary hover:bg-surface-muted"
                  )}
                >
                  {c.status === "completed"
                    ? "View review"
                    : isMulti ? "Open charts" : anyAiReady ? "Open prefilled review" : "Start review"}
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
                {c.status === "completed" && c.review_result?.id && (
                  <DownloadPdfButton resultId={c.review_result.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
