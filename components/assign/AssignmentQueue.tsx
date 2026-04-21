"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ReviewerCard } from "@/components/assign/ReviewerCard";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Stethoscope,
  Building2,
} from "lucide-react";
import type { ReviewCase, Reviewer } from "@/types";

interface PendingCase extends ReviewCase {
  provider: NonNullable<ReviewCase["provider"]>;
  reviewer: NonNullable<ReviewCase["reviewer"]>;
  company: NonNullable<ReviewCase["company"]>;
}

interface AssignmentQueueProps {
  pendingCases: PendingCase[];
  alternateReviewers: Record<string, Reviewer[]>;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const variant =
    confidence >= 80
      ? "bg-green-100 text-green-800 border-green-200"
      : confidence >= 60
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${variant}`}
    >
      {confidence}%
    </span>
  );
}

export function AssignmentQueue({
  pendingCases: initialCases,
  alternateReviewers,
}: AssignmentQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approvingAll, setApprovingAll] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [reassigningIds, setReassigningIds] = useState<Set<string>>(
    new Set()
  );

  async function handleApproveAll() {
    setApprovingAll(true);
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve_all: true, batch_id: initialCases[0]?.batch_id }),
      });
      if (!res.ok) throw new Error("Failed to approve all");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Approve all failed:", err);
    } finally {
      setApprovingAll(false);
    }
  }

  async function handleApproveSingle(caseId: string) {
    setApprovingIds((prev) => new Set(prev).add(caseId));
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(caseId);
        return next;
      });
    }
  }

  async function handleReassign(caseId: string, newReviewerId: string) {
    setReassigningIds((prev) => new Set(prev).add(caseId));
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          reassign_to: newReviewerId,
        }),
      });
      if (!res.ok) throw new Error("Failed to reassign");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Reassign failed:", err);
    } finally {
      setReassigningIds((prev) => {
        const next = new Set(prev);
        next.delete(caseId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initialCases.length} assignment{initialCases.length !== 1 ? "s" : ""}{" "}
          awaiting approval
        </p>
        <Button
          onClick={handleApproveAll}
          disabled={approvingAll || isPending || initialCases.length === 0}
        >
          {approvingAll ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Approve All
        </Button>
      </div>

      {/* Case cards */}
      <div className="grid gap-4">
        {initialCases.map((c) => {
          const isApproving = approvingIds.has(c.id);
          const isReassigning = reassigningIds.has(c.id);
          const isBusy = isApproving || isReassigning || isPending;

          // Parse confidence from notes JSON or use default
          let confidence = 85;
          let rationale = "Specialty match";
          if (c.notes) {
            try {
              const parsed = JSON.parse(c.notes);
              if (parsed.confidence) confidence = parsed.confidence;
              if (parsed.rationale) rationale = parsed.rationale;
            } catch {
              // notes is plain text rationale
              rationale = c.notes;
            }
          }

          const alts = alternateReviewers[c.id] || [];

          return (
            <Card key={c.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {c.provider.first_name} {c.provider.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.provider.specialty}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {c.company.name}
                    </div>
                  </div>
                  <ConfidenceBadge confidence={confidence} />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-3">
                {/* Proposed reviewer */}
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Proposed Reviewer
                  </p>
                  <ReviewerCard
                    reviewer={c.reviewer}
                    confidence={confidence}
                    rationale={rationale}
                    compact={false}
                  />
                </div>

                {/* AI rationale */}
                <div className="flex items-start gap-2">
                  <Badge variant="ai" className="mt-0.5 shrink-0">
                    AI
                  </Badge>
                  <p className="text-xs text-muted-foreground">{rationale}</p>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-6 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy || alts.length === 0}
                    >
                      {isReassigning ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-3 w-3" />
                      )}
                      Reassign
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel>
                      Specialty-matched reviewers
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {alts.length === 0 ? (
                      <DropdownMenuItem disabled>
                        No alternative reviewers available
                      </DropdownMenuItem>
                    ) : (
                      alts.map((alt) => (
                        <DropdownMenuItem
                          key={alt.id}
                          onClick={() => handleReassign(c.id, alt.id)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {alt.full_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {alt.specialty}
                              {alt.board_certification
                                ? ` - ${alt.board_certification}`
                                : ""}
                              {" | "}
                              {alt.active_cases_count} active
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  onClick={() => handleApproveSingle(c.id)}
                  disabled={isBusy}
                >
                  {isApproving ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3 w-3" />
                  )}
                  Approve
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
