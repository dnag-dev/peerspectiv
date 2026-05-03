"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReviewerPickerModal } from "@/components/assign/ReviewerPickerModal";
import { ConfirmApproveModal } from "@/components/assign/ConfirmApproveModal";
import {
  Loader2,
  Building2,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import type { ReviewCase, Peer } from "@/types";

interface PendingCase extends ReviewCase {
  provider: NonNullable<ReviewCase["provider"]>;
  peer: NonNullable<ReviewCase["peer"]>;
  company: NonNullable<ReviewCase["company"]>;
}

interface AssignmentQueueProps {
  pendingCases: PendingCase[];
  alternateReviewers: Record<string, Peer[]>;
}

export function AssignmentQueue({
  pendingCases: initialCases,
  alternateReviewers,
}: AssignmentQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approvingAll, setApprovingAll] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [reassigningIds, setReassigningIds] = useState<Set<string>>(new Set());
  const [pickerOpenForCase, setPickerOpenForCase] = useState<string | null>(null);
  const [confirmOpenForCase, setConfirmOpenForCase] = useState<string | null>(null);

  async function handleApproveAll() {
    setApprovingAll(true);
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve_all: true, batch_id: initialCases[0]?.batch_id }),
      });
      if (!res.ok) throw new Error("Failed to approve all");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Approve all failed:", err);
    } finally {
      setApprovingAll(false);
    }
  }

  async function handleApproveSingle(caseId: string, formId?: string | null) {
    setApprovingIds((prev) => new Set(prev).add(caseId));
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          ...(formId ? { company_form_id: formId } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(caseId);
        return next;
      });
    }
  }

  async function handleReassign(caseId: string, newReviewerId: string) {
    setReassigningIds((prev) => new Set(prev).add(caseId));
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          reassign_to: newReviewerId,
        }),
      });
      if (!res.ok) throw new Error("Failed to reassign");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Reassign failed:", err);
    } finally {
      setReassigningIds((prev) => {
        const next = new Set(prev);
        next.delete(caseId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleApproveAll}
          disabled={approvingAll || isPending || initialCases.length === 0}
          className="inline-flex items-center gap-2 rounded-md border border-cobalt-700 bg-paper-surface px-3.5 py-2 text-sm font-medium text-cobalt-700 transition-colors hover:bg-cobalt-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {approvingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Approve all
          <span className="inline-flex items-center rounded-sm bg-cobalt-100 px-1.5 py-0.5 font-mono text-code text-cobalt-700">
            {initialCases.length}
          </span>
        </button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
        {initialCases.map((c) => {
          const isApproving = approvingIds.has(c.id);
          const isReassigning = reassigningIds.has(c.id);
          const isBusy = isApproving || isReassigning || isPending;

          // Parse confidence + rationale from notes JSON
          let confidence = 85;
          let rationale: string | null = null;
          let alert: string | null = null;
          if (c.notes) {
            try {
              const parsed = JSON.parse(c.notes);
              if (typeof parsed.confidence === "number") confidence = parsed.confidence;
              if (typeof parsed.rationale === "string") rationale = parsed.rationale;
              if (typeof parsed.alert === "string") alert = parsed.alert;
            } catch {
              rationale = c.notes;
            }
          }

          const neededSpecialty =
            c.specialty_required || c.provider.specialty || "—";
          const activeCases = c.peer.active_cases_count ?? 0;
          const totalReviews = c.peer.total_reviews_completed ?? 0;
          const isThinRationale =
            !rationale || rationale.trim().toLowerCase() === "specialty match";
          const displayRationale = isThinRationale
            ? `Dr. ${c.peer.full_name} matches ${neededSpecialty}, has ${activeCases} active case${
                activeCases === 1 ? "" : "s"
              }${activeCases === 0 ? " (lowest available)" : ""}, ${totalReviews} total reviews completed.`
            : rationale!;

          const confidenceVariant: "standard" | "high" | "review" = alert
            ? "review"
            : confidence >= 85
              ? "high"
              : "standard";

          const reviewerInitials = c.peer.full_name
            .split(" ")
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();

          const availability: "available" | "busy" | "unavailable" =
            c.peer.status !== "active"
              ? "unavailable"
              : activeCases >= 8
                ? "busy"
                : "available";

          const batchShort = c.batch_id ? c.batch_id.slice(0, 8) : "—";

          return (
            <article
              key={c.id}
              className="relative flex flex-col bg-paper-surface border border-ink-200 rounded-xl p-[18px] transition-all hover:border-cobalt-300 hover:shadow-md"
            >
              {/* Status indicator */}
              <div className="absolute top-3.5 right-3.5">
                <ConfidenceDot variant={confidenceVariant} />
              </div>

              {/* Company + provider header */}
              <header className="mb-3.5 pr-28 min-h-[56px]">
                <div className="inline-flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-ink-500" />
                  <span className="text-sm font-medium text-ink-900">
                    {c.company.name}
                  </span>
                  <span className="font-mono text-[10px] text-ink-400">
                    · {batchShort}
                  </span>
                </div>
                <div className="text-sm text-ink-600">
                  {c.provider.first_name} {c.provider.last_name}{" "}
                  <span className="text-ink-400">·</span>{" "}
                  <span>{neededSpecialty}</span>
                </div>
              </header>

              {/* Match score panel */}
              <div className="bg-cobalt-soft rounded-lg px-4 py-3.5 mb-3.5 flex justify-between items-center flex-shrink-0">
                <div>
                  <div className="text-eyebrow text-cobalt-700 mb-1">
                    Match score
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-stat-match text-cobalt-700">
                      {confidence}
                    </span>
                    <span className="text-h2 text-cobalt-500">%</span>
                  </div>
                </div>
                <MatchRing value={confidence} />
              </div>

              {/* Reviewer row */}
              <div className="flex items-center gap-2.5 py-3 border-y border-ink-100 mb-3 flex-shrink-0">
                <ReviewerAvatar initials={reviewerInitials} availability={availability} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">
                    {c.peer.full_name}
                  </div>
                  <div className="font-mono text-[10px] text-ink-500 truncate">
                    {c.peer.specialty ?? neededSpecialty} · {totalReviews} reviews · {activeCases} active
                  </div>
                </div>
              </div>

              {/* Variable middle */}
              <div className="flex-1 flex flex-col gap-2.5 mb-3.5">
                {alert && (
                  <div className="flex gap-2 px-2.5 py-2 bg-amber-50 border border-amber-100 rounded-md">
                    <AlertTriangle className="w-3 h-3 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span className="text-[11.5px] text-amber-800 leading-snug">
                      {alert}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <SparkleIcon className="w-2.5 h-2.5 text-cobalt-700 flex-shrink-0 mt-1" />
                  <span className="text-xs text-ink-700 leading-relaxed">
                    {displayRationale}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <footer className="flex items-center justify-between flex-shrink-0 mt-auto">
                <button
                  type="button"
                  onClick={() => setPickerOpenForCase(c.id)}
                  disabled={isBusy}
                  className="btn-ghost text-xs px-2 py-1.5 inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {isReassigning ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3" />
                  )}
                  Reassign
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpenForCase(c.id)}
                  disabled={isBusy}
                  className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {isApproving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Approve →
                </button>
              </footer>

              {/* Modals */}
              <ReviewerPickerModal
                open={pickerOpenForCase === c.id}
                onOpenChange={(open) =>
                  setPickerOpenForCase(open ? c.id : null)
                }
                specialty={neededSpecialty === "—" ? null : neededSpecialty}
                currentReviewerId={c.peer.id}
                onPick={(newReviewerId) => handleReassign(c.id, newReviewerId)}
                title="Reassign reviewer"
              />
              <ConfirmApproveModal
                open={confirmOpenForCase === c.id}
                onOpenChange={(open) =>
                  setConfirmOpenForCase(open ? c.id : null)
                }
                reviewerName={c.peer.full_name}
                companyId={c.company.id}
                specialty={neededSpecialty === "—" ? null : neededSpecialty}
                defaultFormId={
                  (c as unknown as { company_form_id?: string | null })
                    .company_form_id ?? null
                }
                onConfirm={(formId) => handleApproveSingle(c.id, formId)}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ConfidenceDot({ variant }: { variant: "standard" | "high" | "review" }) {
  const config = {
    standard: {
      bg: "bg-cobalt-100",
      dot: "bg-cobalt-700",
      text: "text-cobalt-700",
      label: "Standard",
    },
    high: {
      bg: "bg-mint-100",
      dot: "bg-mint-600",
      text: "text-mint-700",
      label: "High confidence",
    },
    review: {
      bg: "bg-amber-100",
      dot: "bg-amber-600",
      text: "text-amber-700",
      label: "Review needed",
    },
  }[variant];
  return (
    <div className={`flex items-center gap-1.5 ${config.bg} px-2 py-0.5 rounded-sm`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span
        className={`font-mono text-[9px] font-medium tracking-wider uppercase ${config.text}`}
      >
        {config.label}
      </span>
    </div>
  );
}

function MatchRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--cobalt-200)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--cobalt-700)"
        strokeWidth="6"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function ReviewerAvatar({
  initials,
  availability,
}: {
  initials: string;
  availability?: "available" | "busy" | "unavailable";
}) {
  const dot =
    availability === "available"
      ? "bg-mint-600"
      : availability === "busy"
        ? "bg-amber-500"
        : "bg-ink-400";
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cobalt-100 to-cobalt-200 flex items-center justify-center text-cobalt-700 text-xs font-medium">
        {initials || "?"}
      </div>
      {availability && (
        <div
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${dot} border-[1.5px] border-white`}
        />
      )}
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 11 11" className={className} fill="currentColor" aria-hidden>
      <path d="M5.5 1l1.2 3.3L10 5.5 6.7 6.7 5.5 10 4.3 6.7 1 5.5l3.3-1.2L5.5 1z" />
    </svg>
  );
}
