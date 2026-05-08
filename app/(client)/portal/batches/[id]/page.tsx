import { notFound } from "next/navigation";
import Link from "next/link";
import { db, toSnake } from "@/lib/db";
import { batches as batchesTable, reviewCases, companyForms } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStatusBadge } from "@/components/batches/CaseStatusBadge";
import { PDFUploader } from "@/components/batches/PDFUploader";
import { BatchSpecialtyFormEditor } from "@/components/batches/BatchSpecialtyFormEditor";
import { DeleteCaseButton } from "@/components/batches/DeleteCaseButton";
import { cn } from "@/lib/utils";
import { ArrowLeft, FileStack, Calendar, Hash } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

function formatDate(d: any): string {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function BatchStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[status] || variants.pending)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function ClientBatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, params.id)).limit(1);
  if (!batch) notFound();

  const cases = await db.query.reviewCases.findMany({
    where: eq(reviewCases.batchId, params.id),
    orderBy: asc(reviewCases.createdAt),
    with: {
      provider: { columns: { id: true, firstName: true, lastName: true, specialty: true } },
    },
  });

  const snakeCases = cases.map((c) => toSnake<any>(c));

  // Get form info
  let formName: string | null = null;
  let formSpecialty: string | null = null;
  if (batch.companyFormId) {
    const [form] = await db
      .select({ formName: companyForms.formName, specialty: companyForms.specialty })
      .from(companyForms)
      .where(eq(companyForms.id, batch.companyFormId))
      .limit(1);
    if (form) {
      formName = form.formName;
      formSpecialty = form.specialty;
    }
  }

  const totalCases = batch.totalCases ?? 0;
  const completedCases = batch.completedCases ?? 0;
  const assignedCases = batch.assignedCases ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/batches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-ink-primary mb-2">
          <ArrowLeft className="h-4 w-4" />
          Batches
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{batch.batchName || "Untitled"}</h1>
          <BatchStatusBadge status={batch.status || "pending"} />
        </div>
      </div>

      {/* Batch Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Upload Date</p>
              <p className="text-sm font-medium">{formatDate(batch.dateUploaded)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Hash className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Cases</p>
              <p className="text-sm font-medium">{completedCases}/{totalCases} completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileStack className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Assigned</p>
              <p className="text-sm font-medium">{assignedCases}/{totalCases}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Specialty & Form */}
      {batch.companyId && (
        <BatchSpecialtyFormEditor
          batchId={batch.id}
          companyId={batch.companyId}
          currentSpecialty={batch.specialty || formSpecialty || ""}
          currentFormId={batch.companyFormId ?? null}
          currentFormName={formName}
        />
      )}

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-5 w-5" />
            Cases
            <Badge variant="secondary" className="ml-2">{snakeCases.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snakeCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileStack className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium">No cases in this batch</h3>
              <p className="mt-1 text-sm text-gray-500">Cases will appear here once uploaded.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Chart</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snakeCases.map((rc: any) => (
                  <TableRow key={rc.id}>
                    <TableCell className="font-medium">
                      {rc.provider
                        ? `${rc.provider.first_name} ${rc.provider.last_name}`
                        : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {rc.specialty_required || rc.provider?.specialty || "—"}
                    </TableCell>
                    <TableCell>
                      <CaseStatusBadge status={rc.status || "unassigned"} />
                    </TableCell>
                    <TableCell className="text-gray-500">{formatDate(rc.due_date)}</TableCell>
                    <TableCell>
                      <PDFUploader
                        caseId={rc.id}
                        existingFileName={rc.chart_file_name}
                        existingFileUrl={rc.chart_file_path}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteCaseButton
                        caseId={rc.id}
                        chartFileName={rc.chart_file_name}
                        isCompleted={rc.status === "completed"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
