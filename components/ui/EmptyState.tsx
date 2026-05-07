import Link from "next/link";
import { Inbox } from "lucide-react";

/**
 * Phase 2 — canonical empty state. Used wherever a list or filtered view
 * has zero rows. NEVER a dead click — every drill-down page must render
 * this when count=0 so the user sees a clear message and a way back.
 */
export function EmptyState({
  title,
  message,
  backHref,
}: {
  title: string;
  message: string;
  backHref?: string;
}) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <Inbox className="h-12 w-12 text-ink-tertiary mb-4" />
      <h2 className="text-lg font-medium tracking-tight text-ink-primary">{title}</h2>
      <p className="text-sm text-ink-secondary max-w-md mt-2">{message}</p>
      {backHref && (
        <Link href={backHref} className="mt-4 text-sm text-status-info-dot underline hover:text-status-info-fg">
          ← Back
        </Link>
      )}
    </div>
  );
}
