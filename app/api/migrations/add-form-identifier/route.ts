import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * One-time migration: adds form_identifier column and backfills from existing form_name.
 * Safe to run multiple times (idempotent).
 *
 * Backfill logic:
 * - If form_name contains " - " pattern like "Company - Specialty - Identifier",
 *   extract the last segment as form_identifier.
 * - Otherwise, use the full form_name as form_identifier.
 */
export async function POST() {
  try {
    // 1. Add column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE company_forms ADD COLUMN IF NOT EXISTS form_identifier text
    `);

    // 2. Backfill: extract identifier from form_name
    // Pattern: "Company Name - Specialty - Identifier"
    // We split on " - " and take everything after the second separator
    await db.execute(sql`
      UPDATE company_forms
      SET form_identifier = CASE
        WHEN form_name LIKE '% - % - %'
          THEN substring(form_name FROM '(?:.*? - ){2}(.*)')
        ELSE form_name
      END
      WHERE form_identifier IS NULL
    `);

    // 3. Verify
    const result = await db.execute(sql`
      SELECT id, form_name, form_identifier FROM company_forms ORDER BY created_at DESC
    `);

    return NextResponse.json({
      message: 'Migration complete',
      updated: result.rows?.length ?? 0,
      rows: result.rows,
    });
  } catch (err: any) {
    console.error('[migration/add-form-identifier]', err);
    return NextResponse.json({ error: err?.message || 'Migration failed' }, { status: 500 });
  }
}
