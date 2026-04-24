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
import { Badge } from "@/components/ui/badge";
import { ReviewerCard } from "@/components/assign/ReviewerCard";
import { ReviewerPickerModal } from "@/components/assign/ReviewerPickerModal";
import { ConfirmApproveModal } from "@/components/assign/ConfirmApproveModal";
import {
  CheckCircle2,
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
  const [pickerOpenForCase, setPickerOpenForCase] = useState<string | null>(null);
  const [confirmOpenForCase, setConfirmOpenForCase] = useState<string | null>(null);

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

  async function handleApproveSingle(caseId: string, formId?: string | null) {
    setApprovingIds((prev) => new Set(prev).add(caseId));
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          ...(formId ? { company_form_id: formId } : {}),
        }),
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
          let rationale: string | null = null;
          if (c.notes) {
            try {
              const parsed = JSON.parse(c.notes);
              if (parsed.confidence) confidence = parsed.confidence;
              if (parsed.rationale) rationale = parsed.rationale;
            } catch {
              rationale = c.notes;
            }
          }
          // If the AI returned a thin rationale (e.g. "Specialty match"), expand it
          // with concrete reviewer stats so Ashton can trust the pick at a glance.
          const neededSpecialty = c.specialty_required || c.provider.specialty || "—";
          const activeCases = c.reviewer.active_cases_count ?? 0;
          const totalReviews = c.reviewer.total_reviews_completed ?? 0;
          const isThinRationale =
            !rationale || rationale.trim().toLowerCase() === "specialty match";
          const displayRationale = isThinRationale
            ? `Dr. ${c.reviewer.full_name} matches ${neededSpecialty}, has ${activeCases} active case${activeCases === 1 ? "" : "s"}${
                activeCases === 0 ? " (lowest available)" : ""
              }, ${totalReviews} total reviews completed.`
            : rationale!;

          const alts = alternateReviewers[c.id] || [];

          return (
            <Card key={c.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="truncate text-base font-semibold">
                        {c.company.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {c.provider.first_name} {c.provider.last_name}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {neededSpecialty}
                      </span>
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
                    rationale={displayRationale}
                    compact={false}
                  />
                </div>

                {/* AI rationale */}
                <div className="flex items-start gap-2">
                  <Badge variant="ai" className="mt-0.5 shrink-0">
                    AI
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {displayRationale}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-6 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => setPickerOpenForCase(c.id)}
                >
                  {isReassigning ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-3 w-3" />
                  )}
                  Reassign
                </Button>

                <ReviewerPickerModal
                  open={pickerOpenForCase === c.id}
                  onOpenChange={(open) =>
                    setPickerOpenForCase(open ? c.id : null)
                  }
                  specialty={neededSpecialty === "—" ? null : neededSpecialty}
                  currentReviewerId={c.reviewer.id}
                  onPick={(newReviewerId) => handleReassign(c.id, newReviewerId)}
                  title="Reassign reviewer"
                />

                <Button
                  size="sm"
                  onClick={() => setConfirmOpenForCase(c.id)}
                  disabled={isBusy}
                >
                  {isApproving ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3 w-3" />
                  )}
                  Approve
                </Button>

                <ConfirmApproveModal
                  open={confirmOpenForCase === c.id}
                  onOpenChange={(open) =>
                    setConfirmOpenForCase(open ? c.id : null)
                  }
                  reviewerName={c.reviewer.full_name}
                  companyId={c.company.id}
                  specialty={neededSpecialty === "—" ? null : neededSpecialty}
                  defaultFormId={
                    (c as unknown as { company_form_id?: string | null })
                      .company_form_id ?? null
                  }
                  onConfirm={(formId) => handleApproveSingle(c.id, formId)}
                />
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
