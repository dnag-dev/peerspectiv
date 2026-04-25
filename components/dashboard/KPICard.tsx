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
  color: string;
  trend?: string;
  pulse?: boolean;
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
      <Card data-testid="kpi-card" className="relative overflow-hidden">
        <div className={cn("absolute left-0 top-0 h-full w-1.5", color)} />
        <div className="flex items-start gap-4 p-5 pl-6">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card data-testid="kpi-card" className="relative overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn("absolute left-0 top-0 h-full w-1.5", color)} />
      <div className="flex items-start gap-4 p-5 pl-6">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            color.replace("bg-", "bg-").replace(/\/?\d*$/, "/10"),
            pulse && "animate-pulse"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-stat-large text-ink-950">
              {value.toLocaleString()}
            </span>
            {trend && (
              <Badge
                variant={trend.startsWith("+") ? "completed" : "pending"}
              >
                {trend}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-eyebrow text-ink-500">{title}</p>
        </div>
      </div>
    </Card>
  );
}
