import { db } from '@/lib/db';
import { tags, caseTags, companies } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { TagsView } from './TagsView';

export const dynamic = 'force-dynamic';

export default async function TagsPage() {
  // Phase 6.3 — load tags with live case_count and the owning company name
  // (cadence-scoped tags only). Returned shape matches what TagsView expects.
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
      usageCount: tags.usageCount,
      createdBy: tags.createdBy,
      createdAt: tags.createdAt,
      scope: tags.scope,
      companyId: tags.companyId,
      companyName: companies.name,
      periodLabel: tags.periodLabel,
      caseCount: sql<number>`(
        SELECT COUNT(*)::int FROM case_tags ct WHERE ct.tag_id = ${tags.id}
      )`.as('case_count'),
    })
    .from(tags)
    .leftJoin(companies, eq(companies.id, tags.companyId))
    .orderBy(desc(tags.createdAt));

  // Pass-through; TagsView splits by scope.
  void caseTags; // referenced for type-safety, query uses raw sql above
  return <TagsView initialTags={rows} />;
}
