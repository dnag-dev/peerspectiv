import { db } from "@/lib/db";
import { reviewCases, providers, reviewResults, batches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { ReviewsTable } from "./ReviewsTable";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

function labelize(item: any): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    return (
      item.criterion ??
      item.note ??
      item.description ??
      item.label ??
      item.name ??
      null
    );
  }
  return null;
}

export default async function AllReviewsPage({
  searchParams,
}: {
  searchParams: {
    month?: string;
    criterion?: string;
    status?: string;
    specialty?: string;
    quarter?: string;
  };
}) {
  noStore();
  const company = await getDemoCompany();
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
      deficiencies: reviewResults.deficiencies,
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
      providerSpecialty: providers.specialty,
      batchName: batches.batchName,
    })
    .from(reviewCases)
    .leftJoin(providers, eq(providers.id, reviewCases.providerId))
    .leftJoin(reviewResults, eq(reviewResults.caseId, reviewCases.id))
    .leftJoin(batches, eq(batches.id, reviewCases.batchId))
    .where(eq(reviewCases.companyId, company.id))
    .orderBy(desc(reviewCases.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Reviews</h1>
        <p className="text-sm text-ink-secondary">
          Peer review cases for {company.name}
        </p>
      </div>
      <ReviewsTable
        initialMonth={searchParams.month ?? null}
        initialCriterion={searchParams.criterion ?? null}
        initialStatus={searchParams.status ?? "all"}
        initialSpecialty={searchParams.specialty ?? "all"}
        initialQuarter={
          searchParams.quarter === "current"
            ? `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
            : (searchParams.quarter ?? "all")
        }
        rows={rows.map((r) => {
          const defs = Array.isArray(r.deficiencies)
            ? (r.deficiencies as any[]).map(labelize).filter(Boolean) as string[]
            : [];
          return {
            id: r.id,
            status: r.status ?? "unassigned",
            specialty: r.specialty ?? r.providerSpecialty ?? "—",
            providerName:
              `${r.providerFirst ?? ""} ${r.providerLast ?? ""}`.trim() || "—",
            chartFileName: r.chartFileName ?? "—",
            chartFilePath: r.chartFilePath ?? null,
            batchName: r.batchName ?? null,
            assignedAt: r.assignedAt ? new Date(r.assignedAt as any).toISOString() : null,
            dueDate: r.dueDate ? new Date(r.dueDate as any).toISOString() : null,
            createdAt: r.createdAt ? new Date(r.createdAt as any).toISOString() : null,
            submittedAt: r.submittedAt
              ? new Date(r.submittedAt as any).toISOString()
              : null,
            deficiencies: defs,
          };
        })}
      />
    </div>
  );
}
