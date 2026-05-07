/**
 * StatusPill — the only acceptable status colors in the app.
 *
 * Use one of the 5 semantic variants. Avoid creating ad-hoc colored
 * pills; if a shade you need isn't here, add a new variant rather
 * than inlining a hex value.
 */
import * as React from "react";

export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusPillProps {
  variant: StatusVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: "bg-status-success-bg text-status-success-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
  danger:  "bg-status-danger-bg text-status-danger-fg",
  info:    "bg-status-info-bg text-status-info-fg",
  neutral: "bg-status-neutral-bg text-status-neutral-fg",
};

const dotColors: Record<StatusVariant, string> = {
  success: "bg-status-success-dot",
  warning: "bg-status-warning-dot",
  danger:  "bg-status-danger-dot",
  info:    "bg-status-info-dot",
  neutral: "bg-status-neutral-dot",
};

export default function StatusPill({
  variant,
  children,
  dot = false,
  className = "",
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
