import { Badge } from "@/components/ui/badge";
import { User, Award, Stethoscope, BarChart3 } from "lucide-react";
import type { Peer } from "@/types";

interface ReviewerCardProps {
  peer: Peer;
  confidence?: number;
  rationale?: string;
  compact?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const variant =
    confidence >= 80
      ? "bg-mint-100 text-cobalt-700"
      : confidence >= 60
        ? "bg-amber-100 text-amber-700"
        : "bg-critical-100 text-critical-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${variant}`}
    >
      {confidence}% match
    </span>
  );
}

export function ReviewerCard({
  peer,
  confidence,
  rationale,
  compact = false,
}: ReviewerCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt-100">
          <User className="h-4 w-4 text-cobalt-600" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{peer.full_name}</p>
          <p className="text-xs text-muted-foreground">{peer.specialty}</p>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cobalt-100">
            <User className="h-5 w-5 text-cobalt-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">{peer.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Stethoscope className="h-3 w-3" />
              {peer.specialty}
            </div>
          </div>
        </div>
        {confidence !== undefined && (
          <ConfidenceBadge confidence={confidence} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {peer.board_certification && (
          <span className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            {peer.board_certification}
          </span>
        )}
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          {peer.total_reviews_completed} reviews
        </span>
        {peer.ai_agreement_score !== null && (
          <span className="flex items-center gap-1">
            <Badge variant="ai" className="text-[10px] px-1.5 py-0">
              AI Agreement {peer.ai_agreement_score}%
            </Badge>
          </span>
        )}
        <span>
          Active cases: {peer.active_cases_count}
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
