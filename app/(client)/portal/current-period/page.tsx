import { db } from "@/lib/db";
import { reviewCases, providers, batches } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { getCurrentCadencePeriod } from "@/lib/cadence/periods";
import { CaseStatusBadge } from "@/components/batches/CaseStatusBadge";
import { PDFUploader } from "@/components/batches/PDFUploader";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

function formatDate(d: any): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function CurrentPeriodPage() {
  noStore();
  const company = await getDemoCompany();

  // Get current cadence period
  let periodLabel = "";
  let periodStart = "";
  let periodEnd = "";
  try {
    const period = await getCurrentCadencePeriod(company.id);
    periodLabel = period?.label ?? "";
    periodStart = period?.start_date ?? "";
    periodEnd = period?.end_date ?? "";
  } catch {
    periodLabel = "";
  }

  // Get all cases for this period
  const conditions = [eq(reviewCases.companyId, company.id)];
  if (periodLabel) {
    conditions.push(eq(reviewCases.cadencePeriodLabel, periodLabel));
  }

  const cases = await db
    .select({
      id: reviewCases.id,
      status: reviewCases.status,
      specialty: reviewCases.specialtyRequired,
      chartFileName: reviewCases.chartFileName,
      chartFilePath: reviewCases.chartFilePath,
      dueDate: reviewCases.dueDate,
      createdAt: reviewCases.createdAt,
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
      batchName: batches.batchName,
    })
    .from(reviewCases)
    .leftJoin(providers, eq(providers.id, reviewCases.providerId))
    .leftJoin(batches, eq(batches.id, reviewCases.batchId))
    .where(and(...conditions))
    .orderBy(desc(reviewCases.createdAt));

  // Status summary
  const statusCounts: Record<string, number> = {};
  for (const c of cases) {
    const s = c.status ?? "unassigned";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="flex items-center gap-1 text-sm text-gray-500 hover:text-ink-primary mb-2">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium text-ink-primary">
            Reviews — {periodLabel || "Current Period"}
          </h1>
          <Badge variant="secondary">{cases.length} cases</Badge>
        </div>
        <p className="text-sm text-ink-secondary mt-1">
          {company.name} · {periodStart && periodEnd
            ? `${formatDate(periodStart + "T00:00:00")} – ${formatDate(periodEnd + "T00:00:00")}`
            : "Current review cycle"}
        </p>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2">
            <CaseStatusBadge status={status} />
            <span className="text-sm font-medium">{count}</span>
          </div>
        ))}
      </div>

      {/* Cases table */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-gray-50 text-left">
            <tr className="text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Chart</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No review cases for this period.
                </td>
              </tr>
            )}
            {cases.map((c) => {
              const provider = `${c.providerFirst ?? ""} ${c.providerLast ?? ""}`.trim() || "—";
              return (
                <tr key={c.id} className="border-b border-border-subtle hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {c.chartFilePath ? (
                      <a href={c.chartFilePath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px] block">
                        {c.chartFileName ?? "—"}
                      </a>
                    ) : (
                      <span className="text-ink-primary">{c.chartFileName ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-primary">{provider}</td>
                  <td className="px-4 py-3 text-gray-500">{c.specialty ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{c.batchName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <CaseStatusBadge status={c.status ?? "unassigned"} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.dueDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
