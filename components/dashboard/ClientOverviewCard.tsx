'use client';

import Link from 'next/link';
import StatusPill from '@/components/ui/StatusPill';
import ProgressBar from '@/components/ui/ProgressBar';

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
  let statusVariant: 'success' | 'warning' | 'danger' = 'success';
  let statusLabel = 'On track';

  if (projectedCompletion) {
    const projected = new Date(projectedCompletion);
    const daysUntil = Math.ceil((projected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) { statusVariant = 'danger'; statusLabel = 'Behind'; }
    else if (daysUntil < 7) { statusVariant = 'warning'; statusLabel = 'At risk'; }
  }

  return (
    <Link
      href={companyId ? `/companies/${companyId}` : '#'}
      className="flex h-full flex-col rounded-md border border-border-subtle bg-surface-card p-3 transition hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink-primary">{companyName ?? 'Unknown'}</p>
        {state && (
          <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-ink-secondary">
            {state}
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <ProgressBar value={progressPct} />
      </div>
      <div className="mt-auto flex items-center justify-between pt-2.5">
        <p className="text-xs text-ink-secondary">{completed} of {total} cases</p>
        <StatusPill variant={statusVariant}>{statusLabel}</StatusPill>
      </div>
    </Link>
  );
}
