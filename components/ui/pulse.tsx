"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Pulse design-system primitives. Consolidated in one file so we don't
 * proliferate tiny modules — each export is a small visual recipe that
 * appears across the product.
 */

/* ---------- Sparkle ◆ — the Ash brand mark ---------- */

export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 11 11" className={cn("h-2.5 w-2.5", className)} aria-hidden>
      <path
        d="M5.5 1l1.2 3.3L10 5.5 6.7 6.7 5.5 10 4.3 6.7 1 5.5l3.3-1.2L5.5 1z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---------- AI confidence chip ---------- */

export function AIConfidenceChip({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  const tier = confidence >= 75 ? "high" : confidence >= 40 ? "low" : "very-low";
  const styles = {
    "high":     "bg-status-info-bg text-status-info-fg",
    "low":      "bg-amber-100 text-status-warning-fg",
    "very-low": "bg-critical-100 text-status-danger-fg",
  }[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-code",
        styles,
        className
      )}
    >
      <SparkIcon className="h-2 w-2" />
      <span className="font-medium">{confidence}%</span>
    </span>
  );
}

/* ---------- Filter chip (replaces native <select>) ---------- */

export function FilterChip({
  label,
  value,
  onClick,
  className,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-card px-2.5 py-1.5 text-xs text-ink-secondary transition-colors hover:border-status-info-fg/40 hover:bg-status-info-bg",
        className
      )}
    >
      <span className="text-ink-secondary">{label}:</span>
      <span className="font-medium text-ink-800">{value}</span>
      <svg viewBox="0 0 8 8" className="h-2 w-2 text-ink-tertiary" aria-hidden>
        <path d="M1 2l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/* ---------- Persona switcher (segmented pill) ---------- */

export interface PersonaOption {
  id: string;
  label: string;
}

export function PersonaSwitcher({
  options,
  active,
  onChange,
  className,
}: {
  options: PersonaOption[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex gap-1 rounded-lg bg-ink-100 p-1", className)}>
      {options.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-xs transition-all",
            active === p.id
              ? "bg-surface-card font-medium text-status-info-fg shadow-sm"
              : "font-normal text-ink-secondary hover:text-ink-primary"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Delta chip ---------- */

export function DeltaChip({
  value,
  direction,
  className,
}: {
  value: string;
  direction: "up" | "down" | "flat";
  className?: string;
}) {
  const styles = {
    up:   "bg-mint-100 text-status-success-fg",
    down: "bg-critical-100 text-status-danger-fg",
    flat: "bg-ink-100 text-ink-secondary",
  }[direction];
  const arrow = direction === "up" ? "▴" : direction === "down" ? "▾" : "·";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-code",
        styles,
        className
      )}
    >
      <span>{value}</span>
      <span aria-hidden>{arrow}</span>
    </span>
  );
}

/* ---------- Hero gradient card ---------- */

export function HeroGradientCard({
  eyebrow,
  value,
  unit,
  delta,
  description,
  primaryCta,
  secondaryCta,
  rightSlot,
  className,
}: {
  eyebrow: string;
  value: React.ReactNode;
  unit?: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  description?: string;
  primaryCta?: { label: string; onClick?: () => void; href?: string };
  secondaryCta?: { label: string; onClick?: () => void; href?: string };
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-brand p-6 text-white shadow-lg",
        className
      )}
    >
      {/* Decorative circles */}
      <svg
        viewBox="0 0 300 300"
        className="pointer-events-none absolute -right-20 -top-24 h-[300px] w-[300px] opacity-[0.13]"
        aria-hidden
      >
        <circle cx="150" cy="150" r="120" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="150" cy="150" r="80" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="150" cy="150" r="40" fill="none" stroke="white" strokeWidth="1" />
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-eyebrow text-white/85 mb-3">{eyebrow}</div>
          <div className="mb-2 flex items-baseline gap-1.5">
            <span className="text-stat-hero">{value}</span>
            {unit && <span className="text-h1 opacity-85">{unit}</span>}
            {delta && (
              <span className="ml-2 -translate-y-1.5 inline-flex items-center gap-1 rounded-sm bg-white/18 px-2 py-1 text-code text-white backdrop-blur">
                {delta.value}{" "}
                <span aria-hidden>
                  {delta.direction === "up" ? "▴" : delta.direction === "down" ? "▾" : "·"}
                </span>
              </span>
            )}
          </div>
          {description && (
            <p className="mb-4 max-w-sm text-sm text-white/92">{description}</p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-2">
              {primaryCta &&
                (primaryCta.href ? (
                  <a
                    href={primaryCta.href}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-status-info-fg transition-colors hover:bg-status-info-bg"
                  >
                    {primaryCta.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={primaryCta.onClick}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-status-info-fg transition-colors hover:bg-status-info-bg"
                  >
                    {primaryCta.label}
                  </button>
                ))}
              {secondaryCta &&
                (secondaryCta.href ? (
                  <a
                    href={secondaryCta.href}
                    className="rounded-md border border-white/30 bg-white/16 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/24"
                  >
                    {secondaryCta.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={secondaryCta.onClick}
                    className="rounded-md border border-white/30 bg-white/16 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/24"
                  >
                    {secondaryCta.label}
                  </button>
                ))}
            </div>
          )}
        </div>
        {rightSlot && <div className="hidden sm:block flex-shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}

/* ---------- Match score panel ---------- */

export function MatchScorePanel({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div
      className={cn(
        "rounded-lg bg-cobalt-soft p-3.5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-eyebrow text-status-info-fg mb-1">Match score</div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-stat-match text-status-info-fg">{score}</span>
            <span className="text-h2 text-status-info-dot">%</span>
          </div>
        </div>
        <svg viewBox="0 0 60 60" className="h-15 w-15" style={{ width: 60, height: 60 }}>
          <circle cx="30" cy="30" r={r} fill="none" stroke="var(--cobalt-200)" strokeWidth="6" />
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke="var(--cobalt-700)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 30 30)"
          />
        </svg>
      </div>
    </div>
  );
}

/* ---------- Sparkline (gradient fill) ---------- */

export function Sparkline({
  data,
  color = "var(--cobalt-500)",
  fill = true,
  className,
  height = 28,
}: {
  data: number[];
  color?: string;
  fill?: boolean;
  className?: string;
  height?: number;
}) {
  const id = React.useId();
  if (!data.length) return null;
  const w = 120;
  const h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,${h} ${points.join(" ")} ${w},${h}`}
            fill={`url(#spark-${id})`}
          />
        </>
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- KPI sparkline card ---------- */

export function KPISparklineCard({
  label,
  value,
  delta,
  trend,
  semanticColor = "var(--cobalt-500)",
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  trend?: number[];
  semanticColor?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-subtle/60 bg-surface-card p-3.5 shadow-sm",
        className
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="text-eyebrow text-ink-secondary truncate">{label}</div>
        {delta && <DeltaChip value={delta.value} direction={delta.direction} />}
      </div>
      <div className="text-stat-large text-ink-primary">{value}</div>
      {trend && trend.length > 1 && (
        <Sparkline data={trend} color={semanticColor} className="mt-2.5 h-7" />
      )}
    </div>
  );
}
