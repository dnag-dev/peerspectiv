import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tags, caseTags } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/tags          → list all tags ordered by usage_count desc
 * POST /api/tags { name, color?, description? } → create
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope');
    const baseQuery = db
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
        periodLabel: tags.periodLabel,
        // Phase 6.3 — live count of cases referencing this tag (preferred over
        // tags.usage_count which only tracks tag_associations).
        caseCount: sql<number>`(
          SELECT COUNT(*)::int FROM case_tags ct WHERE ct.tag_id = ${tags.id}
        )`,
      })
      .from(tags);
    const rows = scope
      ? await baseQuery.where(eq(tags.scope, scope)).orderBy(desc(tags.createdAt))
      : await baseQuery.orderBy(desc(tags.usageCount), desc(tags.createdAt));
    return NextResponse.json({ tags: rows, data: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tags] GET failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color, description, scope, company_id, period_label } = body as {
      name?: string;
      color?: string;
      description?: string;
      scope?: string;
      company_id?: string;
      period_label?: string;
    };
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const finalScope =
      scope === 'cadence' || scope === 'global' ? scope : 'global';

    // SA-053: Reject cadence-shaped names when creating global tags
    if (finalScope === 'global') {
      const cadencePattern = /^(Q[1-4]\s+\d{4}|[A-Z][a-z]{2}\s+\d{4}|[A-Z][a-z]{2}\s+[–-]\s+[A-Z][a-z]{2}\s+\d{4})/;
      if (cadencePattern.test(name.trim())) {
        return NextResponse.json(
          { error: 'This looks like a cadence label (e.g., "Q1 2026"). Cadence tags are auto-generated — use a different name for ad-hoc tags.', code: 'CADENCE_NAME_CONFLICT' },
          { status: 400 }
        );
      }
    }
    const createdBy =
      req.headers.get('x-demo-user-id')?.trim() || 'admin-demo';
    const [row] = await db
      .insert(tags)
      .values({
        name: name.trim(),
        color: color?.trim() || 'cobalt',
        description: description?.trim() || null,
        createdBy,
        scope: finalScope,
        companyId: finalScope === 'cadence' ? company_id ?? null : null,
        periodLabel: finalScope === 'cadence' ? period_label ?? null : null,
      })
      .returning();
    return NextResponse.json({ tag: row, data: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // unique-violation friendly message
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Tag name already exists', code: 'DUPLICATE' },
        { status: 409 }
      );
    }
    console.error('[tags] POST failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
