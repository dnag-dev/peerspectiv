import { db } from "@/lib/db";
import { reviewCases, providers, reviewResults } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { ReviewsTable } from "./ReviewsTable";

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
  searchParams: { month?: string; criterion?: string };
}) {
  const company = await getDemoCompany();
  const rows = await db
    .select({
      id: reviewCases.id,
      status: reviewCases.status,
      specialty: reviewCases.specialtyRequired,
      chartFileName: reviewCases.chartFileName,
      assignedAt: reviewCases.assignedAt,
      dueDate: reviewCases.dueDate,
      createdAt: reviewCases.createdAt,
      submittedAt: reviewResults.submittedAt,
      deficiencies: reviewResults.deficiencies,
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
      providerSpecialty: providers.specialty,
    })
    .from(reviewCases)
    .leftJoin(providers, eq(providers.id, reviewCases.providerId))
    .leftJoin(reviewResults, eq(reviewResults.caseId, reviewCases.id))
    .where(eq(reviewCases.companyId, company.id))
    .orderBy(desc(reviewCases.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">All Reviews</h1>
        <p className="text-sm text-gray-400">
          All peer review cases for {company.name}
        </p>
      </div>
      <ReviewsTable
        initialMonth={searchParams.month ?? null}
        initialCriterion={searchParams.criterion ?? null}
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
