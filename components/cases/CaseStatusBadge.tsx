import { cn } from "@/lib/utils";
import type { CaseStatus, AIAnalysisStatus } from "@/types";

const caseStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  unassigned: {
    label: "Unassigned",
    className: "bg-ink-100 text-ink-700",
  },
  pending_approval: {
    label: "Pending Approval",
    className: "bg-amber-100 text-amber-700 animate-pulse",
  },
  assigned: {
    label: "Assigned",
    className: "bg-cobalt-100 text-cobalt-600",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-mint-100 text-cobalt-700",
  },
  completed: {
    label: "Completed",
    className: "bg-mint-100 text-cobalt-700",
  },
  past_due: {
    label: "Past Due",
    className: "bg-critical-100 text-critical-700 ring-2 ring-critical-600",
  },
};

const aiStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-ink-100 text-ink-600",
  },
  processing: {
    label: "Processing",
    className: "bg-mint-100 text-cobalt-700 animate-pulse",
  },
  complete: {
    label: "Complete",
    className: "bg-mint-100 text-cobalt-700",
  },
  failed: {
    label: "Failed",
    className: "bg-critical-100 text-critical-700",
  },
};

interface CaseStatusBadgeProps {
  status: CaseStatus | string;
  size?: "sm" | "default";
}

export function CaseStatusBadge({ status, size = "default" }: CaseStatusBadgeProps) {
  const config = caseStatusConfig[status] || caseStatusConfig.unassigned;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium capitalize",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

interface AIStatusBadgeProps {
  status: AIAnalysisStatus | string;
  size?: "sm" | "default";
}

export function AIStatusBadge({ status, size = "default" }: AIStatusBadgeProps) {
  const config = aiStatusConfig[status] || aiStatusConfig.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
