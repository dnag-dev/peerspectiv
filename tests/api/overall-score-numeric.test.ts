/**
 * Regression: overall_score on review_results and ai_analyses must arrive as
 * a JS number from drizzle. The column is numeric(5,2) with mode:'number';
 * if anyone drops the mode, drizzle will silently start returning strings
 * and "88.89" + 0 will render as "88.890" in the UI.
 *
 * See migration 010 + commit 5092b5a for context.
 */
import { describe, expect, it } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

describe('overall_score column', () => {
  it('returns number from review_results when mode:number is set', async () => {
    if (!process.env.DATABASE_URL) {
      // Skip silently in CI without DB. Local + dev pipeline has it.
      console.warn('[overall_score test] DATABASE_URL not set — skipping');
      return;
    }
    const { db } = await import('@/lib/db');
    const { reviewResults } = await import('@/lib/db/schema');

    const rows = await db
      .select({ score: reviewResults.overallScore })
      .from(reviewResults)
      .limit(5);

    if (rows.length === 0) {
      console.warn('[overall_score test] no review_results rows — skipping');
      return;
    }

    for (const r of rows) {
      if (r.score == null) continue;
      expect(typeof r.score).toBe('number');
      // Sanity: in [0, 100], else somebody persisted nonsense.
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('returns number from ai_analyses when mode:number is set', async () => {
    if (!process.env.DATABASE_URL) return;
    const { db } = await import('@/lib/db');
    const { aiAnalyses } = await import('@/lib/db/schema');

    const rows = await db
      .select({ score: aiAnalyses.overallScore })
      .from(aiAnalyses)
      .limit(5);

    if (rows.length === 0) return;
    for (const r of rows) {
      if (r.score == null) continue;
      expect(typeof r.score).toBe('number');
    }
  });
});
