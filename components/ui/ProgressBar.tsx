/**
 * ProgressBar — 6px tall, semantic threshold-driven fill.
 * Default thresholds: ≥85% green (success), 70-84% amber (warning), <70% red (danger).
 */
import * as React from "react";

interface ProgressBarProps {
  value: number; // 0-100
  thresholds?: { warning: number; danger: number };
  height?: number; // default 6
  className?: string;
}

export default function ProgressBar({
  value,
  thresholds = { warning: 85, danger: 70 },
  height = 6,
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill =
    clamped >= thresholds.warning
      ? "bg-status-success-dot"
      : clamped >= thresholds.danger
      ? "bg-status-warning-dot"
      : "bg-status-danger-dot";
  return (
    <div
      className={`overflow-hidden rounded-full bg-surface-muted ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full ${fill} transition-[width] duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
