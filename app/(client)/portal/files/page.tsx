import { db, toSnake } from "@/lib/db";
import { batches, companies, reviewCases } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getCompanyId(): Promise<string | null> {
  const rows = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.name, "Hunter Health"))
    .limit(1);
  return rows[0]?.id ?? null;
}

interface BatchRow {
  id: string;
  batch_name: string | null;
  date_uploaded: string | null;
  total_cases: number;
  completed_cases: number;
  status: string | null;
  specialty: string | null;
  created_at: string | null;
}

interface FileRow {
  id: string;
  chart_file_name: string | null;
  status: string | null;
  specialty_required: string | null;
  created_at: string | null;
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(uploadDate: string | Date | null, expirationDays: number = 30): boolean {
  if (!uploadDate) return false;
  const uploaded = new Date(uploadDate);
  const now = new Date();
  const diffDays = (now.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > expirationDays;
}

export default async function ClientFilesPage() {
  noStore();
  const companyId = await getCompanyId();
  if (!companyId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Files</h1>
        <Card>
          <CardContent className="py-12 text-center text-ink-500">
            No company found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const batchRows = await db
    .select({
      id: batches.id,
      batchName: batches.batchName,
      dateUploaded: batches.dateUploaded,
      totalCases: batches.totalCases,
      completedCases: batches.completedCases,
      status: batches.status,
      specialty: batches.specialty,
      createdAt: batches.createdAt,
    })
    .from(batches)
    .where(eq(batches.companyId, companyId))
    .orderBy(desc(batches.createdAt));

  const batchList: BatchRow[] = batchRows.map((b) => ({
    id: b.id,
    batch_name: b.batchName,
    date_uploaded: b.dateUploaded?.toISOString() ?? null,
    total_cases: b.totalCases ?? 0,
    completed_cases: b.completedCases ?? 0,
    status: b.status,
    specialty: b.specialty,
    created_at: b.createdAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Files</h1>
        <p className="text-sm text-ink-400">
          All batches uploaded for review — {batchList.length} batches total.
        </p>
      </div>

      {batchList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-ink-300" />
            <h3 className="text-lg font-medium text-ink-200">No files uploaded yet</h3>
            <p className="mt-1 text-sm text-ink-400">
              Upload charts via <Link href="/portal/submit" className="text-cobalt-400 hover:underline">Submit Records</Link> to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-800/50 text-ink-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Batch Name</th>
                  <th className="px-4 py-3 text-left">Specialty</th>
                  <th className="px-4 py-3 text-left">Upload Date</th>
                  <th className="px-4 py-3 text-center">Files</th>
                  <th className="px-4 py-3 text-center">Completed</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {batchList.map((batch) => {
                  const expired = isExpired(batch.date_uploaded ?? batch.created_at);
                  return (
                    <tr key={batch.id} className="border-t border-ink-700/50 hover:bg-ink-800/30">
                      <td className="px-4 py-3 font-medium text-ink-100">
                        <Link
                          href={`/portal/files/${batch.id}`}
                          className="text-cobalt-400 hover:underline flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          {batch.batch_name || "Untitled batch"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-300">{batch.specialty ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-400">
                        {formatDate(batch.date_uploaded ?? batch.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center text-ink-300">{batch.total_cases}</td>
                      <td className="px-4 py-3 text-center text-ink-300">{batch.completed_cases}</td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10">
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-ink-600 text-ink-300">
                            {batch.status ?? "uploaded"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
