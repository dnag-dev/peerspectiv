"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | undefined;
  icon: ReactNode;
  /** Optional semantic hint used only for the icon tint background. */
  color?: string;
  trend?: string;
  pulse?: boolean;
}

/**
 * Map the legacy `color` prop (used historically for an accent bar) onto a
 * subtle 10%-opacity tint background for the icon container. The card itself
 * stays a plain white surface — no vertical bars, no four-color accents.
 */
function tintBg(color?: string): string {
  switch (color) {
    case "bg-cobalt-500":   return "bg-status-info-bg";
    case "bg-cobalt-600":   return "bg-status-info-bg";
    case "bg-status-success-dot":     return "bg-status-success-dot/10";
    case "bg-status-warning-dot":    return "bg-status-warning-dot/10";
    case "bg-status-danger-dot": return "bg-status-danger-dot/10";
    case "bg-ink-500":      return "bg-ink-500/10";
    default:                return "bg-status-info-bg";
  }
}

export function KPICard({
  title,
  value,
  icon,
  color,
  trend,
  pulse,
}: KPICardProps) {
  if (value === undefined) {
    return (
      <Card data-testid="kpi-card" className="bg-surface-card border border-border-subtle rounded-lg shadow-sm">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </Card>
    );
  }

  // Map legacy `color` prop to a semantic dot tone for the new design system.
  const dotByColor =
    color === "bg-status-success-dot" ? "bg-status-success-dot" :
    color === "bg-status-warning-dot" ? "bg-status-warning-dot" :
    color === "bg-status-danger-dot" ? "bg-status-danger-dot" :
    color === "bg-cobalt-500" || color === "bg-cobalt-600" ? "bg-status-info-dot" :
    "bg-status-neutral-dot";

  return (
    <Card
      data-testid="kpi-card"
      className="rounded-md border border-border-subtle bg-surface-card shadow-none transition hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", dotByColor, pulse && "animate-pulse")} />
            <span className="eyebrow">{title}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="display-number">{value.toLocaleString()}</span>
            {trend && (
              <Badge variant={trend.startsWith("+") ? "completed" : "pending"}>
                {trend}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-muted">
          {icon}
        </div>
      </div>
    </Card>
  );
}
