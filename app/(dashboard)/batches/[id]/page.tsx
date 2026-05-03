import Link from "next/link";
import { notFound } from "next/navigation";
import { db, toSnake } from "@/lib/db";
import { batches as batchesTable, reviewCases, companyForms } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStatusBadge, AIStatusBadge } from "@/components/batches/CaseStatusBadge";
import { BatchActions } from "@/components/batches/BatchActions";
import { PDFUploader } from "@/components/batches/PDFUploader";
import { BatchFormSection } from "@/components/batches/BatchFormSection";
import { cn } from "@/lib/utils";
import { ArrowLeft, FileStack, Calendar, Building2, Hash } from "lucide-react";
import type { Batch, ReviewCase, Provider, Reviewer } from "@/types";

export const dynamic = 'force-dynamic';

interface CaseWithRelations extends Omit<ReviewCase, 'provider' | 'reviewer'> {
  provider?: Provider | null;
  reviewer?: Reviewer | null;
}

interface BatchDetail extends Batch {
  company_name: string | null;
  attached_form: { id: string; form_name: string; specialty: string } | null;
  cases: CaseWithRelations[];
}

function BatchStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-cobalt-100 text-cobalt-600",
    completed: "bg-mint-100 text-cobalt-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[status] || variants.pending
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function getBatchDetail(id: string): Promise<BatchDetail | null> {
  const batch = await db.query.batches.findFirst({
    where: eq(batchesTable.id, id),
    with: { company: { columns: { name: true } } },
  });

  if (!batch) return null;

  // Attached company form is referenced by batches.companyFormId but isn't a
  // declared Drizzle relation — fetch it separately.
  let attachedForm: { id: string; form_name: string; specialty: string } | null = null;
  if (batch.companyFormId) {
    const [f] = await db
      .select({
        id: companyForms.id,
        form_name: companyForms.formName,
        specialty: companyForms.specialty,
      })
      .from(companyForms)
      .where(eq(companyForms.id, batch.companyFormId))
      .limit(1);
    attachedForm = f ?? null;
  }

  const cases = await db.query.reviewCases.findMany({
    where: eq(reviewCases.batchId, id),
    orderBy: asc(reviewCases.createdAt),
    with: {
      provider: { columns: { id: true, firstName: true, lastName: true, specialty: true } },
      reviewer: { columns: { id: true, fullName: true, email: true, specialty: true } },
    },
  });

  const mappedCases: CaseWithRelations[] = cases.map((c) => {
    const snake = toSnake<any>(c);
    return snake;
  });

  const batchSnake = toSnake<any>({ ...batch, company: undefined });
  return {
    ...batchSnake,
    company_name: batch.company?.name ?? null,
    attached_form: attachedForm,
    cases: mappedCases,
  };
}

export default async function BatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const batch = await getBatchDetail(params.id);

  if (!batch) {
    notFound();
  }

  const hasUnassigned = batch.cases.some((c) => c.status === "unassigned");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/batches" className="flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Batches
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{batch.batch_name}</h1>
            <BatchStatusBadge status={batch.status} />
          </div>
        </div>
        <BatchActions batchId={batch.id} hasUnassigned={hasUnassigned} />
      </div>

      {/* Batch Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="text-sm font-medium">{batch.company_name || "Unassigned"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Upload Date</p>
              <p className="text-sm font-medium">{formatDate(batch.date_uploaded)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cases</p>
              <p className="text-sm font-medium">
                {batch.completed_cases}/{batch.total_cases} completed
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileStack className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="text-sm font-medium">
                {batch.assigned_cases}/{batch.total_cases}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attached form */}
      {batch.company_id && (batch as unknown as { specialty?: string }).specialty && (
        <BatchFormSection
          batchId={batch.id}
          companyId={batch.company_id}
          specialty={(batch as unknown as { specialty: string }).specialty}
          currentFormId={
            batch.attached_form?.id ??
            (batch as unknown as { company_form_id?: string | null }).company_form_id ??
            null
          }
          currentFormName={batch.attached_form?.form_name ?? null}
        />
      )}

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-5 w-5" />
            Cases
            <Badge variant="secondary" className="ml-2">
              {batch.cases.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batch.cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileStack className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No cases in this batch</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cases will appear here once uploaded.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>AI Analysis</TableHead>
                  <TableHead>Chart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.cases.map((reviewCase) => (
                  <TableRow key={reviewCase.id}>
                    <TableCell className="font-medium">
                      {reviewCase.provider
                        ? `${reviewCase.provider.first_name} ${reviewCase.provider.last_name}`
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {reviewCase.specialty_required ||
                        reviewCase.provider?.specialty ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      {reviewCase.reviewer ? (
                        <span>{reviewCase.reviewer.full_name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CaseStatusBadge status={reviewCase.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(reviewCase.due_date)}
                    </TableCell>
                    <TableCell>
                      <AIStatusBadge status={reviewCase.ai_analysis_status} />
                    </TableCell>
                    <TableCell>
                      <PDFUploader
                        caseId={reviewCase.id}
                        existingFileName={reviewCase.chart_file_name}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {batch.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{batch.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
