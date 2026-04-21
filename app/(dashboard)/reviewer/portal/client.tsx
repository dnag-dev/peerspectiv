"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewCase } from "@/types";

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

interface ReviewerPortalClientProps {
  cases: ReviewCase[];
}

export function ReviewerPortalClient({ cases }: ReviewerPortalClientProps) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
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
        <h2 className="text-lg font-semibold text-gray-900">
          No Assigned Cases
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          You have no cases in your queue. Check back later for new assignments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          {cases.length} case{cases.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((c) => {
          const days = c.due_date ? daysUntilDue(c.due_date) : null;
          const isPastDue = days != null && days < 0;
          const isUrgent = days != null && days <= 2 && days >= 0;

          return (
            <div
              key={c.id}
              data-testid="case-card"
              data-case-id={c.id}
              className="group flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-blue/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {c.provider?.first_name} {c.provider?.last_name}
                    </h3>
                    {c.priority !== "normal" && (
                      <Badge
                        variant={
                          c.priority === "urgent" ? "destructive" : "warning"
                        }
                        className="text-[10px]"
                      >
                        {c.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {c.provider?.specialty ?? "General"} · {c.company?.name}
                  </p>
                </div>
              </div>

              {c.due_date && (
                <div
                  className={cn(
                    "mt-3 text-xs font-medium",
                    isPastDue
                      ? "text-red-600"
                      : isUrgent
                        ? "text-amber-600"
                        : "text-gray-500"
                  )}
                >
                  {isPastDue
                    ? `${Math.abs(days!)}d overdue`
                    : days === 0
                      ? "Due today"
                      : days === 1
                        ? "Due tomorrow"
                        : `Due ${formatShortDate(c.due_date)} (${days}d)`}
                </div>
              )}

              <div className="mt-2 flex items-center gap-1.5">
                <Badge
                  variant={c.status === "in_progress" ? "warning" : "secondary"}
                  className="text-[10px]"
                >
                  {c.status === "in_progress" ? "In Progress" : "Assigned"}
                </Badge>
                {c.ai_analysis_status === "complete" && (
                  <Badge variant="ai" className="text-[10px]">
                    AI Ready
                  </Badge>
                )}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <Link
                  href={`/reviewer/cases/${c.id}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-blue px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue/90"
                >
                  Start Review
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
