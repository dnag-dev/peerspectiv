import { db } from "@/lib/db";
import { reviewCases, providers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { ReviewsTable } from "./ReviewsTable";

export const dynamic = "force-dynamic";

export default async function AllReviewsPage() {
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
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
      providerSpecialty: providers.specialty,
    })
    .from(reviewCases)
    .leftJoin(providers, eq(providers.id, reviewCases.providerId))
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
        rows={rows.map((r) => ({
          id: r.id,
          status: r.status ?? "unassigned",
          specialty: r.specialty ?? r.providerSpecialty ?? "—",
          providerName:
            `${r.providerFirst ?? ""} ${r.providerLast ?? ""}`.trim() || "—",
          chartFileName: r.chartFileName ?? "—",
          assignedAt: r.assignedAt ? new Date(r.assignedAt as any).toISOString() : null,
          dueDate: r.dueDate ? new Date(r.dueDate as any).toISOString() : null,
          createdAt: r.createdAt ? new Date(r.createdAt as any).toISOString() : null,
        }))}
      />
    </div>
  );
}
