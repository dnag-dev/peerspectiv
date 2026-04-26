import { cn } from "@/lib/utils";

const caseStatusVariants: Record<string, string> = {
  unassigned: "bg-ink-100 text-ink-700",
  pending_approval: "bg-amber-100 text-amber-700 animate-pulse",
  assigned: "bg-cobalt-100 text-cobalt-600",
  in_progress: "bg-mint-100 text-cobalt-700",
  completed: "bg-mint-100 text-cobalt-700",
  past_due: "bg-critical-100 text-critical-700 ring-2 ring-critical-600",
};

const aiStatusVariants: Record<string, string> = {
  pending: "bg-ink-100 text-ink-600",
  processing: "bg-mint-100 text-cobalt-700 animate-pulse",
  complete: "bg-mint-100 text-cobalt-700",
  failed: "bg-critical-100 text-critical-700",
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
