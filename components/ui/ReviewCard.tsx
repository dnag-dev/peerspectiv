/**
 * ReviewCard — peer queue card. Critical: uses flex-column + mt-auto on the
 * action button so cards in a row align regardless of varied content above.
 */
import * as React from "react";
import StatusPill, { type StatusVariant } from "./StatusPill";

interface ReviewCardProps {
  providerName: string;
  context: string; // "Internal Medicine · Hunter Health · Q4 2025"
  dueLabel: string; // "Due 12d"
  dueTone: Extract<StatusVariant, "danger" | "warning" | "neutral">;
  hasAIPrefill: boolean;
  chartCount: number;
  onAction: () => void;
}

export default function ReviewCard({
  providerName,
  context,
  dueLabel,
  dueTone,
  hasAIPrefill,
  chartCount,
  onAction,
}: ReviewCardProps) {
  return (
    <div className="flex flex-col rounded-md border border-border-subtle bg-surface-card p-3.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-ink-primary">{providerName}</p>
          <p className="truncate text-xs text-ink-secondary">{context}</p>
        </div>
        <StatusPill variant={dueTone}>{dueLabel}</StatusPill>
      </div>

      {hasAIPrefill ? (
        <span className="mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#EEEDFE] px-2 py-0.5 text-2xs font-medium text-[#3C3489]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 8 6h8z" />
            <path d="M12 22v-6" />
            <circle cx="12" cy="11" r="5" />
          </svg>
          AI prefill ready · {chartCount} {chartCount === 1 ? "chart" : "charts"}
        </span>
      ) : (
        <span className="mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-ink-secondary">
          <span className="h-1 w-1 rounded-full bg-ink-tertiary" />
          New · {chartCount} {chartCount === 1 ? "chart" : "charts"}
        </span>
      )}

      {/* mt-auto pins button to bottom — the alignment fix */}
      <button
        type="button"
        onClick={onAction}
        className={
          hasAIPrefill
            ? "mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
            : "mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-muted"
        }
      >
        {hasAIPrefill ? "Open prefilled review" : "Start review"}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
