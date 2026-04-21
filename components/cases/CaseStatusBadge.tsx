import { cn } from "@/lib/utils";
import type { CaseStatus, AIAnalysisStatus } from "@/types";

const caseStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  unassigned: {
    label: "Unassigned",
    className: "bg-gray-100 text-gray-700",
  },
  pending_approval: {
    label: "Pending Approval",
    className: "bg-amber-100 text-amber-700 animate-pulse",
  },
  assigned: {
    label: "Assigned",
    className: "bg-blue-100 text-blue-700",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-teal-100 text-teal-700",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700",
  },
  past_due: {
    label: "Past Due",
    className: "bg-red-100 text-red-700 ring-2 ring-red-300",
  },
};

const aiStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-600",
  },
  processing: {
    label: "Processing",
    className: "bg-purple-100 text-purple-700 animate-pulse",
  },
  complete: {
    label: "Complete",
    className: "bg-green-100 text-green-700",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700",
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
