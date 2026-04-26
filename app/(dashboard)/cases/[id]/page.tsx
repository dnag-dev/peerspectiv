import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CaseStatusBadge, AIStatusBadge } from "@/components/cases/CaseStatusBadge";
import { AIAnalysisPanel, TriggerAnalysisButton } from "@/components/cases/AIAnalysisPanel";
import {
  ArrowLeft,
  Calendar,
  Building2,
  User,
  Stethoscope,
  FileText,
  Clock,
  Hash,
  Shield,
} from "lucide-react";
import type {
  ReviewCase,
  Provider,
  Reviewer,
  Company,
  Batch,
  AIAnalysis,
  ReviewResult,
  AuditLog,
  CriterionScore,
} from "@/types";

export const dynamic = 'force-dynamic';

interface CaseDetail extends Omit<ReviewCase, 'provider' | 'reviewer' | 'company' | 'batch' | 'ai_analysis' | 'review_result'> {
  provider: Provider | null;
  reviewer: Reviewer | null;
  company: Company | null;
  batch: Batch | null;
  ai_analysis: AIAnalysis | null;
  review_result: ReviewResult | null;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getCaseDetail(id: string): Promise<CaseDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("review_cases")
    .select(
      `
      *,
      provider:providers(id, first_name, last_name, specialty, npi, email),
      reviewer:reviewers(id, full_name, email, specialty, board_certification, active_cases_count, total_reviews_completed, ai_agreement_score, status),
      company:companies(id, name, contact_person, contact_email),
      batch:batches(id, batch_name, status),
      ai_analysis:ai_analyses(
        id, chart_summary, criteria_scores, deficiencies,
        overall_score, documentation_score,
        clinical_appropriateness_score, care_coordination_score,
        narrative_draft, model_used, processing_time_ms, tokens_used, created_at
      ),
      review_result:review_results(
        id, criteria_scores, deficiencies, overall_score,
        narrative_final, ai_agreement_percentage, reviewer_changes,
        quality_score, quality_notes, submitted_at, time_spent_minutes
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // Supabase returns arrays for one-to-many; pick first element for one-to-one relations
  const aiAnalysisRaw = data.ai_analysis;
  const reviewResultRaw = data.review_result;

  return {
    ...data,
    provider: data.provider as unknown as Provider | null,
    reviewer: data.reviewer as unknown as Reviewer | null,
    company: data.company as unknown as Company | null,
    batch: data.batch as unknown as Batch | null,
    ai_analysis: Array.isArray(aiAnalysisRaw)
      ? (aiAnalysisRaw[0] as AIAnalysis) ?? null
      : (aiAnalysisRaw as unknown as AIAnalysis | null),
    review_result: Array.isArray(reviewResultRaw)
      ? (reviewResultRaw[0] as ReviewResult) ?? null
      : (reviewResultRaw as unknown as ReviewResult | null),
  } as CaseDetail;
}

async function getAuditLogs(caseId: string): Promise<AuditLog[]> {
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .eq("resource_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []) as AuditLog[];
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [reviewCase, auditLogs] = await Promise.all([
    getCaseDetail(id),
    getAuditLogs(id),
  ]);

  if (!reviewCase) {
    notFound();
  }

  const providerName = reviewCase.provider
    ? `${reviewCase.provider.first_name} ${reviewCase.provider.last_name}`
    : "Unknown Provider";

  const specialty =
    reviewCase.specialty_required ||
    reviewCase.provider?.specialty ||
    "General";

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href={reviewCase.batch_id ? `/batches/${reviewCase.batch_id}` : "/batches"}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {reviewCase.batch?.batch_name || "Cases"}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {providerName}
          </h1>
          <CaseStatusBadge status={reviewCase.status} />
          <AIStatusBadge status={reviewCase.ai_analysis_status} />
        </div>
      </div>

      {/* Case info header cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Specialty</p>
              <p className="text-sm font-medium">{specialty}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="text-sm font-medium">
                {reviewCase.company?.name || "Unassigned"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                Assigned Reviewer
              </p>
              <p className="text-sm font-medium">
                {reviewCase.reviewer?.full_name || "Unassigned"}
              </p>
              {reviewCase.reviewer?.specialty && (
                <p className="text-xs text-muted-foreground">
                  {reviewCase.reviewer.specialty}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Dates</p>
              <p className="text-xs">
                Encounter: {formatDate(reviewCase.encounter_date)}
              </p>
              <p className="text-xs">
                Due: {formatDate(reviewCase.due_date)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      {reviewCase.ai_analysis ? (
        <AIAnalysisPanel
          analysis={reviewCase.ai_analysis}
          reviewResult={reviewCase.review_result}
          caseId={reviewCase.id}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mint-50">
              <Stethoscope className="h-8 w-8 text-cobalt-500" />
            </div>
            <h3 className="text-lg font-medium">No AI Analysis Yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {reviewCase.ai_analysis_status === "processing"
                ? "AI analysis is currently in progress. Refresh the page to check for updates."
                : reviewCase.ai_analysis_status === "failed"
                  ? "AI analysis failed. You can re-trigger it below."
                  : "Trigger AI analysis to get automated scoring, deficiency detection, and narrative drafts."}
            </p>
            {reviewCase.ai_analysis_status !== "processing" && (
              <div className="mt-4">
                <TriggerAnalysisButton caseId={reviewCase.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Result */}
      {reviewCase.review_result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-cobalt-600" />
              Final Review Result
              <Badge variant="success">Completed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score comparison summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Final Overall Score
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {reviewCase.review_result.overall_score ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Quality Score
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {reviewCase.review_result.quality_score ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  AI Agreement
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {reviewCase.review_result.ai_agreement_percentage !== null
                    ? `${reviewCase.review_result.ai_agreement_percentage}%`
                    : "-"}
                </p>
              </div>
            </div>

            {/* Reviewer changes from AI */}
            {reviewCase.review_result.reviewer_changes &&
              reviewCase.review_result.reviewer_changes.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">
                    Reviewer Changes from AI
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criterion</TableHead>
                        <TableHead className="text-center">
                          AI Score
                        </TableHead>
                        <TableHead className="text-center">
                          Reviewer Score
                        </TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewCase.review_result.reviewer_changes.map(
                        (change, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {change.criterion}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="ai">
                                {change.ai_score}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  change.reviewer_score > change.ai_score
                                    ? "success"
                                    : change.reviewer_score < change.ai_score
                                      ? "warning"
                                      : "secondary"
                                }
                              >
                                {change.reviewer_score}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs text-xs text-muted-foreground">
                              {change.reason}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

            {/* Final narrative */}
            {reviewCase.review_result.narrative_final && (
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Final Narrative
                </h4>
                <div className="rounded-md border-l-4 border-mint-200 bg-mint-50 p-4 dark:bg-cobalt-700/20">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {reviewCase.review_result.narrative_final}
                  </p>
                </div>
              </div>
            )}

            {/* Quality notes */}
            {reviewCase.review_result.quality_notes && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Quality Notes</h4>
                <p className="text-sm text-muted-foreground">
                  {reviewCase.review_result.quality_notes}
                </p>
              </div>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {reviewCase.review_result.submitted_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Submitted{" "}
                  {formatDateTime(reviewCase.review_result.submitted_at)}
                </span>
              )}
              {reviewCase.review_result.time_spent_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {reviewCase.review_result.time_spent_minutes} min spent
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart file info */}
      {(reviewCase.chart_file_name || reviewCase.chart_file_path) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Chart File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Filename</p>
                <p className="font-medium">
                  {reviewCase.chart_file_name || "Unnamed file"}
                </p>
              </div>
              {reviewCase.chart_pages && (
                <div>
                  <p className="text-xs text-muted-foreground">Pages</p>
                  <p className="font-medium">{reviewCase.chart_pages}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit trail */}
      {auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-5 w-5" />
              Audit Trail
              <Badge variant="secondary">{auditLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {log.metadata
                        ? JSON.stringify(log.metadata)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
