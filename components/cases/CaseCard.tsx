import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CaseStatusBadge, AIStatusBadge } from "@/components/cases/CaseStatusBadge";
import { Calendar, User, Building2, Stethoscope } from "lucide-react";
import type { ReviewCase } from "@/types";

interface CaseCardProps {
  reviewCase: ReviewCase;
  showCompany?: boolean;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CaseCard({ reviewCase, showCompany = true }: CaseCardProps) {
  const providerName = reviewCase.provider
    ? `${reviewCase.provider.first_name} ${reviewCase.provider.last_name}`
    : "Unknown Provider";

  const specialty =
    reviewCase.specialty_required ||
    reviewCase.provider?.specialty ||
    "General";

  return (
    <Link href={`/cases/${reviewCase.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-medium">
                  {providerName}
                </h3>
                <CaseStatusBadge status={reviewCase.status} size="sm" />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {specialty}
                </span>

                {showCompany && reviewCase.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {reviewCase.company.name}
                  </span>
                )}

                {reviewCase.peer && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {reviewCase.peer.full_name}
                  </span>
                )}

                {reviewCase.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due {formatDate(reviewCase.due_date)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <AIStatusBadge
                status={reviewCase.ai_analysis_status}
                size="sm"
              />
              {reviewCase.chart_file_name && (
                <span className="text-[10px] text-muted-foreground">
                  {reviewCase.chart_pages
                    ? `${reviewCase.chart_pages} pages`
                    : "Chart uploaded"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
