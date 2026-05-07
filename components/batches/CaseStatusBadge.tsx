import { cn } from "@/lib/utils";

const caseStatusVariants: Record<string, string> = {
  unassigned: "bg-ink-100 text-ink-primary",
  pending_approval: "bg-amber-100 text-status-warning-fg animate-pulse",
  assigned: "bg-status-info-bg text-status-info-dot",
  in_progress: "bg-mint-100 text-status-info-fg",
  completed: "bg-mint-100 text-status-info-fg",
  past_due: "bg-critical-100 text-status-danger-fg ring-2 ring-critical-600",
};

const aiStatusVariants: Record<string, string> = {
  pending: "bg-ink-100 text-ink-secondary",
  processing: "bg-mint-100 text-status-info-fg animate-pulse",
  complete: "bg-mint-100 text-status-info-fg",
  failed: "bg-critical-100 text-status-danger-fg",
};

export function CaseStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        caseStatusVariants[status] || caseStatusVariants.unassigned
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AIStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        aiStatusVariants[status] || aiStatusVariants.pending
      )}
    >
      {status}
    </span>
  );
}
