import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { batches, reviewCases, providers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BatchDetailPage({
  params,
}: {
  params: { batchId: string };
}) {
  noStore();

  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, params.batchId))
    .limit(1);

  if (!batch) notFound();

  const cases = await db
    .select({
      id: reviewCases.id,
      chartFileName: reviewCases.chartFileName,
      chartFilePath: reviewCases.chartFilePath,
      status: reviewCases.status,
      specialtyRequired: reviewCases.specialtyRequired,
      providerId: reviewCases.providerId,
      createdAt: reviewCases.createdAt,
    })
    .from(reviewCases)
    .where(eq(reviewCases.batchId, params.batchId))
    .orderBy(asc(reviewCases.chartFileName));

  // Resolve provider names
  const providerIds = Array.from(new Set(cases.map((c) => c.providerId).filter(Boolean))) as string[];
  const providerRows = providerIds.length > 0
    ? await db
        .select({ id: providers.id, firstName: providers.firstName, lastName: providers.lastName })
        .from(providers)
        .where(eq(providers.companyId, batch.companyId ?? ""))
    : [];
  const providerMap = new Map(providerRows.map((p) => [p.id, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-tertiary">
        <Link href="/portal/files" className="flex items-center gap-1 hover:text-ink-200">
          <ArrowLeft className="h-4 w-4" />
          My Files
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-medium text-ink-primary">{batch.batchName || "Untitled batch"}</h1>
        <p className="text-sm text-ink-tertiary">
          {batch.specialty ?? "Mixed specialties"} — uploaded {formatDate(batch.dateUploaded ?? batch.createdAt)} — {cases.length} files
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {cases.length === 0 ? (
            <div className="py-12 text-center text-ink-secondary">No files in this batch.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-800/50 text-ink-tertiary text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">File Name</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Specialty</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Uploaded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-t border-ink-700/50 hover:bg-ink-800/30">
                    <td className="px-4 py-3 text-ink-100 font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-ink-tertiary" />
                      {c.chartFileName || "Unknown file"}
                    </td>
                    <td className="px-4 py-3 text-ink-tertiary">
                      {c.providerId ? providerMap.get(c.providerId) ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-tertiary">{c.specialtyRequired ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          c.status === "completed"
                            ? "border-mint-500/50 text-mint-400 bg-mint-500/10"
                            : "border-ink-600 text-ink-tertiary"
                        }
                      >
                        {c.status ?? "uploaded"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-tertiary">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.chartFilePath && (
                        <a
                          href={c.chartFilePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-white/50 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
