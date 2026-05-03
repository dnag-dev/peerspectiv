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
      <Inbox className="h-12 w-12 text-ink-400 mb-4" />
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <p className="text-sm text-ink-500 max-w-md mt-2">{message}</p>
      {backHref && (
        <Link href={backHref} className="mt-4 text-sm text-cobalt-600 underline hover:text-cobalt-700">
          ← Back
        </Link>
      )}
    </div>
  );
}
