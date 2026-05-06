import { db } from '@/lib/db';
import { companyForms, companies, reviewCases, reviewResults } from '@/lib/db/schema';
import { eq, asc, notInArray, sql } from 'drizzle-orm';
import { FormsView } from './FormsView';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

export default async function FormsPage() {
  noStore();
  const rows = await db
    .select({
      id: companyForms.id,
      companyId: companyForms.companyId,
      companyName: companies.name,
      specialty: companyForms.specialty,
      formName: companyForms.formName,
      formFields: companyForms.formFields,
      isActive: companyForms.isActive,
      approvedBy: companyForms.approvedBy,
      approvedAt: companyForms.approvedAt,
      createdAt: companyForms.createdAt,
      templatePdfUrl: companyForms.templatePdfUrl,
      templatePdfName: companyForms.templatePdfName,
      scoringSystem: companyForms.scoringSystem,
    })
    .from(companyForms)
    .leftJoin(companies, eq(companies.id, companyForms.companyId))
    .orderBy(asc(companies.name), asc(companyForms.specialty));

  // SA-043: Query response counts and avg duration per form
  const statsRows = await db
    .select({
      companyFormId: reviewCases.companyFormId,
      responseCount: sql<number>`count(${reviewResults.id})::int`,
      avgDurationMin: sql<number>`round(avg(${reviewResults.timeSpentMinutes})::numeric, 1)`,
    })
    .from(reviewCases)
    .innerJoin(reviewResults, eq(reviewResults.caseId, reviewCases.id))
    .groupBy(reviewCases.companyFormId);

  const statsMap = new Map<string, { responseCount: number; avgDurationMin: number | null }>();
  for (const s of statsRows) {
    if (s.companyFormId) {
      statsMap.set(s.companyFormId, {
        responseCount: s.responseCount ?? 0,
        avgDurationMin: s.avgDurationMin,
      });
    }
  }

  const formsWithStats = rows.map((r) => {
    const stats = statsMap.get(r.id);
    return {
      ...r,
      responseCount: stats?.responseCount ?? 0,
      avgDurationMin: stats?.avgDurationMin ?? null,
    };
  });

  const companyList = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(notInArray(companies.status, ['lead', 'archived']))
    .orderBy(asc(companies.name));

  return <FormsView forms={formsWithStats} companies={companyList} />;
}
