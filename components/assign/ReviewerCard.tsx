import { Badge } from "@/components/ui/badge";
import { User, Award, Stethoscope, BarChart3 } from "lucide-react";
import type { Reviewer } from "@/types";

interface ReviewerCardProps {
  reviewer: Reviewer;
  confidence?: number;
  rationale?: string;
  compact?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const variant =
    confidence >= 80
      ? "bg-green-100 text-green-800"
      : confidence >= 60
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${variant}`}
    >
      {confidence}% match
    </span>
  );
}

export function ReviewerCard({
  reviewer,
  confidence,
  rationale,
  compact = false,
}: ReviewerCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{reviewer.full_name}</p>
          <p className="text-xs text-muted-foreground">{reviewer.specialty}</p>
        </div>
        {confidence !== undefined && (
          <ConfidenceBadge confidence={confidence} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">{reviewer.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Stethoscope className="h-3 w-3" />
              {reviewer.specialty}
            </div>
          </div>
        </div>
        {confidence !== undefined && (
          <ConfidenceBadge confidence={confidence} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {reviewer.board_certification && (
          <span className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            {reviewer.board_certification}
          </span>
        )}
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          {reviewer.total_reviews_completed} reviews
        </span>
        {reviewer.ai_agreement_score !== null && (
          <span className="flex items-center gap-1">
            <Badge variant="ai" className="text-[10px] px-1.5 py-0">
              AI Agreement {reviewer.ai_agreement_score}%
            </Badge>
          </span>
        )}
        <span>
          Active cases: {reviewer.active_cases_count}
        </span>
      </div>

      {/* Rationale is rendered by the parent (AssignmentQueue) with an AI
          badge — keep a single source so the line doesn't duplicate. */}
      {false && rationale && (
        <p className="text-xs italic text-muted-foreground">{rationale}</p>
      )}
    </div>
  );
}
