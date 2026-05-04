import {
  getDemoCompany,
  getComplianceScore,
  getReviewsThisQuarter,
  getAvgTurnaroundDays,
  getDocumentationRiskRate,
  getRepeatDeficiencyCount,
  getSpecialtyCompliance,
  getRiskDistribution,
  getNeedsAttention,
  getProviderPerformance,
} from "@/lib/portal/queries";
import { db } from "@/lib/db";
import { batches } from "@/lib/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { DashboardView } from "./DashboardView";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  noStore();
  const company = await getDemoCompany();
  const companyId = company.id;

  const [
    compliance,
    reviewsThisQuarter,
    avgTurnaround,
    riskRate,
    repeatCount,
    specialty,
    risk,
    needs,
    providersPerf,
  ] = await Promise.all([
    getComplianceScore(companyId),
    getReviewsThisQuarter(companyId),
    getAvgTurnaroundDays(companyId),
    getDocumentationRiskRate(companyId),
    getRepeatDeficiencyCount(companyId),
    getSpecialtyCompliance(companyId),
    getRiskDistribution(companyId),
    getNeedsAttention(companyId),
    getProviderPerformance(companyId),
  ]);

  // Fetch projected completion from latest active batch
  const [activeBatch] = await db
    .select({ projectedCompletion: batches.projectedCompletion })
    .from(batches)
    .where(
      and(
        eq(batches.companyId, companyId),
        isNotNull(batches.projectedCompletion)
      )
    )
    .orderBy(desc(batches.createdAt))
    .limit(1);

  const projectedCompletion = activeBatch?.projectedCompletion
    ? new Date(activeBatch.projectedCompletion).toISOString()
    : null;

  return (
    <DashboardView
      companyName={company.name}
      projectedCompletion={projectedCompletion}
      compliance={compliance}
      reviewsThisQuarter={reviewsThisQuarter}
      avgTurnaround={avgTurnaround}
      riskRate={riskRate}
      repeatCount={repeatCount}
      specialty={specialty}
      risk={risk}
      needs={{
        pastDue: needs.pastDue.map((c) => ({
          id: c.id,
          name: c.chartFileName ?? "Case",
          due: c.dueDate ? new Date(c.dueDate as any).toISOString() : null,
        })),
        lowProviders: needs.lowProviders,
        openActions: needs.openActions.map((a) => ({
          id: a.id,
          title: a.title,
          dueDate: a.dueDate ? new Date(a.dueDate as any).toISOString() : null,
        })),
      }}
      providers={providersPerf}
    />
  );
}
