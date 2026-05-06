import { db, toSnake } from "@/lib/db";
import { companies, providers, reviewCases } from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { AddProspectModal } from "@/components/prospects/AddProspectModal";
import type { Company } from "@/types";
import { CompaniesView } from "./CompaniesView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CompanyWithCounts extends Company {
  provider_count: number;
  active_case_count: number;
}

async function getCompanies(): Promise<CompanyWithCounts[]> {
  // Belt-and-braces against Next/Vercel data caching. dynamic='force-dynamic'
  // SHOULD prevent caching but the query was returning stale results in prod
  // (rows visible in DB but not in HTML), so opt out at the function level too.
  noStore();
  const companyRows = await db.select().from(companies).orderBy(asc(companies.name));
  if (!companyRows.length) return [];

  const providerCounts = await db
    .select({ companyId: providers.companyId })
    .from(providers)
    .where(eq(providers.status, 'active'));

  const caseCounts = await db
    .select({ companyId: reviewCases.companyId, status: reviewCases.status })
    .from(reviewCases)
    .where(inArray(reviewCases.status, ['unassigned', 'pending_approval', 'assigned', 'in_progress']));

  const providerMap = new Map<string, number>();
  providerCounts.forEach((p) => {
    if (p.companyId) {
      providerMap.set(p.companyId, (providerMap.get(p.companyId) || 0) + 1);
    }
  });

  const caseMap = new Map<string, number>();
  caseCounts.forEach((c) => {
    if (c.companyId) {
      caseMap.set(c.companyId, (caseMap.get(c.companyId) || 0) + 1);
    }
  });

  return companyRows.map((company) => ({
    ...(toSnake(company) as Company),
    provider_count: providerMap.get(company.id) || 0,
    active_case_count: caseMap.get(company.id) || 0,
  }));
}

export default async function CompaniesPage() {
  const companyList = await getCompanies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage companies and their provider networks.
          </p>
        </div>
        <AddProspectModal />
      </div>

      <CompaniesView companies={companyList} />
    </div>
  );
}
