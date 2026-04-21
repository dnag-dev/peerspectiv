import { cn } from "@/lib/utils";

const caseStatusVariants: Record<string, string> = {
  unassigned: "bg-gray-100 text-gray-700",
  pending_approval: "bg-amber-100 text-amber-700 animate-pulse",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  past_due: "bg-red-100 text-red-700 ring-2 ring-red-300",
};

const aiStatusVariants: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  processing: "bg-purple-100 text-purple-700 animate-pulse",
  complete: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
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
