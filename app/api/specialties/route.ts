import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { specialtyTaxonomy } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Phase 2 — multi-specialty UI feed. Returns active specialty taxonomy rows
 * for use in the AddPeerModal multi-select and admin specialty filters.
 */
export async function GET() {
  try {
    const rows = await db
      .select({ id: specialtyTaxonomy.id, name: specialtyTaxonomy.name })
      .from(specialtyTaxonomy)
      .where(eq(specialtyTaxonomy.isActive, true))
      .orderBy(asc(specialtyTaxonomy.name));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[API] GET /api/specialties error:', err);
    return NextResponse.json(
      { error: 'Failed to load specialties', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
