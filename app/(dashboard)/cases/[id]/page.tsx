import Link from "next/link";
import { notFound } from "next/navigation";
import { db, toSnake } from "@/lib/db";
import { reviewCases as reviewCasesTable, auditLogs as auditLogsTable } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
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
  Peer,
  Company,
  Batch,
  AIAnalysis,
  ReviewResult,
  AuditLog,
  CriterionScore,
} from "@/types";

export const dynamic = 'force-dynamic';

interface CaseDetail extends Omit<ReviewCase, 'provider' | 'peer' | 'company' | 'batch' | 'ai_analysis' | 'review_result'> {
  provider: Provider | null;
  peer: Peer | null;
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
  const data = await db.query.reviewCases.findFirst({
    where: eq(reviewCasesTable.id, id),
    with: {
      provider: { columns: { id: true, firstName: true, lastName: true, specialty: true, npi: true, email: true } },
      peer: { columns: { id: true, fullName: true, email: true, specialty: true, boardCertification: true, activeCasesCount: true, totalReviewsCompleted: true, aiAgreementScore: true, status: true } },
      company: { columns: { id: true, name: true, contactPerson: true, contactEmail: true } },
      batch: { columns: { id: true, batchName: true, status: true } },
      aiAnalysis: {
        columns: {
          id: true, chartSummary: true, criteriaScores: true, deficiencies: true,
          overallScore: true, documentationScore: true,
          clinicalAppropriatenessScore: true, careCoordinationScore: true,
          narrativeDraft: true, modelUsed: true, processingTimeMs: true, tokensUsed: true, createdAt: true,
        },
      },
      reviewResult: {
        columns: {
          id: true, criteriaScores: true, deficiencies: true, overallScore: true,
          narrativeFinal: true, aiAgreementPercentage: true, peerChanges: true,
          qualityScore: true, qualityNotes: true, submittedAt: true, timeSpentMinutes: true,
        },
      },
    },
  });

  if (!data) return null;

  const snake = toSnake<any>(data);
  // Drizzle relational query exposes the one-to-one as `case`/`reviewResult`.
  // Snake-case yields `review_result` and `ai_analysis` automatically.
  return {
    ...snake,
    ai_analysis: snake.ai_analysis ?? null,
    review_result: snake.review_result ?? null,
  } as CaseDetail;
}

async function getAuditLogs(caseId: string): Promise<AuditLog[]> {
  const data = await db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.resourceId, caseId))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(50);

  return data.map((d) => toSnake(d)) as AuditLog[];
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
        {/* D7 — admin-only patient identifiers, used for disambiguation. Never
            surfaced in invoices or client reports. */}
        {(reviewCase.patient_first_name ||
          reviewCase.patient_last_name ||
          reviewCase.mrn_number) && (
          <p className="text-xs text-muted-foreground">
            Patient:{" "}
            <span className="font-medium text-foreground">
              {[reviewCase.patient_first_name, reviewCase.patient_last_name]
                .filter(Boolean)
                .join(" ") || "—"}
            </span>
            {reviewCase.mrn_number && (
              <>
                {" "}
                &middot; MRN{" "}
                <span className="font-mono">{reviewCase.mrn_number}</span>
              </>
            )}
            {reviewCase.is_pediatric && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                Pediatric
              </Badge>
            )}
          </p>
        )}
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
                {reviewCase.peer?.full_name || "Unassigned"}
              </p>
              {reviewCase.peer?.specialty && (
                <p className="text-xs text-muted-foreground">
                  {reviewCase.peer.specialty}
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
