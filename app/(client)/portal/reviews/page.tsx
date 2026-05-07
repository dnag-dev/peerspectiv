import { db } from "@/lib/db";
import { reviewCases, providers, reviewResults, batches } from "@/lib/db/schema";
import { and, eq, gte, ilike, inArray, lte, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { ReviewsTable } from "./ReviewsTable";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  provider?: string;
  specialty?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default async function AllReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();
  const company = await getDemoCompany();

  // Build server-side filters
  const conditions: any[] = [eq(reviewCases.companyId, company.id)];

  // Status filter — comma-separated list or single value
  const statusParam = searchParams.status;
  if (statusParam) {
    const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length > 0) conditions.push(inArray(reviewCases.status, statuses));
  } else {
    // Default: unassigned + pending_approval
    conditions.push(inArray(reviewCases.status, ["unassigned", "pending_approval"]));
  }

  if (searchParams.provider) {
    conditions.push(ilike(providers.firstName, `%${searchParams.provider}%`));
  }
  if (searchParams.specialty) {
    conditions.push(ilike(reviewCases.specialtyRequired, `%${searchParams.specialty}%`));
  }
  if (searchParams.dateFrom) {
    conditions.push(gte(reviewCases.createdAt, new Date(`${searchParams.dateFrom}T00:00:00Z`)));
  }
  if (searchParams.dateTo) {
    conditions.push(lte(reviewCases.createdAt, new Date(`${searchParams.dateTo}T23:59:59Z`)));
  }

  const rows = await db
    .select({
      id: reviewCases.id,
      status: reviewCases.status,
      specialty: reviewCases.specialtyRequired,
      chartFileName: reviewCases.chartFileName,
      chartFilePath: reviewCases.chartFilePath,
      assignedAt: reviewCases.assignedAt,
      dueDate: reviewCases.dueDate,
      createdAt: reviewCases.createdAt,
      submittedAt: reviewResults.submittedAt,
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
      providerSpecialty: providers.specialty,
      batchName: batches.batchName,
    })
    .from(reviewCases)
    .leftJoin(providers, eq(providers.id, reviewCases.providerId))
    .leftJoin(reviewResults, eq(reviewResults.caseId, reviewCases.id))
    .leftJoin(batches, eq(batches.id, reviewCases.batchId))
    .where(and(...conditions))
    .orderBy(desc(reviewCases.createdAt))
    .limit(500);

  const activeStatuses = statusParam
    ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
    : ["unassigned", "pending_approval"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Reviews</h1>
        <p className="text-sm text-ink-secondary">
          Peer review cases for {company.name}
        </p>
      </div>
      <ReviewsTable
        rows={rows.map((r) => ({
          id: r.id,
          status: r.status ?? "unassigned",
          specialty: r.specialty ?? r.providerSpecialty ?? "—",
          providerName: `${r.providerFirst ?? ""} ${r.providerLast ?? ""}`.trim() || "—",
          chartFileName: r.chartFileName ?? "—",
          chartFilePath: r.chartFilePath ?? null,
          batchName: r.batchName ?? null,
          dueDate: r.dueDate ? new Date(r.dueDate as any).toISOString() : null,
          createdAt: r.createdAt ? new Date(r.createdAt as any).toISOString() : null,
        }))}
        initialFilters={{
          status: activeStatuses,
          provider: searchParams.provider ?? "",
          specialty: searchParams.specialty ?? "",
          dateFrom: searchParams.dateFrom ?? "",
          dateTo: searchParams.dateTo ?? "",
        }}
      />
    </div>
  );
}
