/**
 * KPICard — colored dot + eyebrow label + 24px value + optional sub.
 * Keep cards in a row inside `grid-cols-N gap-2` so they breathe.
 */
import * as React from "react";

export type KPITone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: KPITone;
}

const dotByTone: Record<KPITone, string> = {
  success: "bg-status-success-dot",
  warning: "bg-status-warning-dot",
  danger:  "bg-status-danger-dot",
  info:    "bg-status-info-dot",
  neutral: "bg-status-neutral-dot",
  brand:   "bg-brand",
};

export default function KPICard({ label, value, sub, tone = "neutral" }: KPICardProps) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-card p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotByTone[tone]}`} />
        <span className="eyebrow">{label}</span>
      </div>
      <p className="display-number mb-0.5">{value}</p>
      {sub && <p className="text-2xs text-ink-tertiary">{sub}</p>}
    </div>
  );
}
