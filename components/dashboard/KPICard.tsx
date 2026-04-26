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
    case "bg-cobalt-500":   return "bg-cobalt-500/10";
    case "bg-cobalt-600":   return "bg-cobalt-600/10";
    case "bg-mint-600":     return "bg-mint-600/10";
    case "bg-amber-600":    return "bg-amber-600/10";
    case "bg-critical-600": return "bg-critical-600/10";
    case "bg-ink-500":      return "bg-ink-500/10";
    default:                return "bg-cobalt-500/10";
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
      <Card data-testid="kpi-card" className="bg-paper-surface border border-ink-200 rounded-lg shadow-sm">
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

  return (
    <Card
      data-testid="kpi-card"
      className="bg-paper-surface border border-ink-200 rounded-lg shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow text-ink-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-stat-large text-ink-900">
              {value.toLocaleString()}
            </span>
            {trend && (
              <Badge variant={trend.startsWith("+") ? "completed" : "pending"}>
                {trend}
              </Badge>
            )}
          </div>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            tintBg(color),
            pulse && "animate-cobalt-pulse"
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
