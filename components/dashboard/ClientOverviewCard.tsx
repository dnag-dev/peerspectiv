'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface ClientOverviewCardProps {
  companyName: string | null;
  state: string | null;
  totalCases: number | null;
  completedCases: number | null;
  projectedCompletion: Date | string | null;
  batchStatus: string | null;
  companyId: string | null;
}

export function ClientOverviewCard({
  companyName,
  state,
  totalCases,
  completedCases,
  projectedCompletion,
  batchStatus,
  companyId,
}: ClientOverviewCardProps) {
  const total = totalCases ?? 0;
  const completed = completedCases ?? 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Determine status indicator based on projected completion
  const now = new Date();
  let statusLabel = 'on-track';
  let statusColor = 'bg-cobalt-500';
  let statusTextColor = 'text-cobalt-700';
  let statusBorderColor = 'border-mint-200';

  if (projectedCompletion) {
    const projected = new Date(projectedCompletion);
    const daysUntil = Math.ceil(
      (projected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) {
      statusLabel = 'delayed';
      statusColor = 'bg-critical-600';
      statusTextColor = 'text-critical-700';
      statusBorderColor = 'border-critical-600';
    } else if (daysUntil < 7) {
      statusLabel = 'at-risk';
      statusColor = 'bg-amber-600';
      statusTextColor = 'text-amber-700';
      statusBorderColor = 'border-amber-600';
    }
  }

  const formattedDate = projectedCompletion
    ? new Date(projectedCompletion).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Link
      href={companyId ? `/companies/${companyId}` : '#'}
      className="block rounded-lg border border-ink-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900 truncate">
          {companyName ?? 'Unknown'}
        </p>
        {state && (
          <Badge variant="outline" className="ml-2 text-[10px] shrink-0">
            {state}
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-2 w-full rounded-full bg-ink-100">
          <div
            className="h-2 rounded-full bg-cobalt-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-500">
          {completed} of {total} cases complete
        </p>
      </div>

      {/* Footer info */}
      <div className="mt-3 flex items-center justify-between">
        {formattedDate && (
          <p className="text-xs text-ink-500">
            Expected: {formattedDate}
          </p>
        )}
        <Badge
          variant="outline"
          className={`text-[10px] ${statusTextColor} ${statusBorderColor}`}
        >
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${statusColor}`} />
          {statusLabel}
        </Badge>
      </div>
    </Link>
  );
}
