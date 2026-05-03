import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies, companySpecialtyRates } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const userId = (auth() as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get('x-demo-user-id') || req.cookies.get('demo_user')?.value;
  return demo?.trim() || null;
}

/** GET — returns pricing mode + flat rate + all per-specialty rate rows for a company. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [company] = await db
    .select({
      id: companies.id,
      pricingMode: (companies as any).pricingMode,
      perReviewRate: companies.perReviewRate,
      itemizeInvoice: companies.itemizeInvoice,
    })
    .from(companies)
    .where(eq(companies.id, params.id))
    .limit(1);
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rates = await db
    .select()
    .from(companySpecialtyRates)
    .where(eq(companySpecialtyRates.companyId, params.id))
    .orderBy(asc(companySpecialtyRates.specialty));

  return NextResponse.json({
    pricing_mode: (company as any).pricingMode ?? 'flat',
    per_review_rate: company.perReviewRate,
    itemize_invoice: company.itemizeInvoice ?? false,
    rates,
  });
}

/**
 * PATCH — update top-level pricing settings.
 * body: { pricing_mode?: 'flat'|'per_specialty', per_review_rate?: number, itemize_invoice?: boolean }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.pricing_mode !== undefined) {
    if (!['flat', 'per_specialty'].includes(body.pricing_mode)) {
      return NextResponse.json({ error: 'pricing_mode must be flat or per_specialty' }, { status: 400 });
    }
    update.pricingMode = body.pricing_mode;
  }
  if (body.per_review_rate !== undefined && body.per_review_rate !== null && body.per_review_rate !== '') {
    const n = Number(body.per_review_rate);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: 'per_review_rate must be positive' }, { status: 400 });
    }
    update.perReviewRate = String(n.toFixed(2));
  }
  if (typeof body.itemize_invoice === 'boolean') {
    update.itemizeInvoice = body.itemize_invoice;
  }

  const [row] = await db
    .update(companies)
    .set(update)
    .where(eq(companies.id, params.id))
    .returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/**
 * POST — add (or upsert) a per-specialty rate row.
 * body: { specialty: string, rate_amount: number, is_default?: boolean }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const specialty = String(body.specialty || '').trim();
  const rate = Number(body.rate_amount);
  const isDefault = Boolean(body.is_default);
  if (!specialty) return NextResponse.json({ error: 'specialty is required' }, { status: 400 });
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: 'rate_amount must be positive' }, { status: 400 });
  }

  // Enforce single default per company.
  if (isDefault) {
    await db
      .update(companySpecialtyRates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(companySpecialtyRates.companyId, params.id));
  }

  // Upsert on (company_id, specialty).
  const existing = await db
    .select()
    .from(companySpecialtyRates)
    .where(and(
      eq(companySpecialtyRates.companyId, params.id),
      eq(companySpecialtyRates.specialty, specialty),
    ))
    .limit(1);

  let row;
  if (existing.length > 0) {
    [row] = await db
      .update(companySpecialtyRates)
      .set({
        rateAmount: String(rate.toFixed(2)),
        isDefault,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .where(eq(companySpecialtyRates.id, existing[0].id))
      .returning();
  } else {
    [row] = await db
      .insert(companySpecialtyRates)
      .values({
        companyId: params.id,
        specialty,
        rateAmount: String(rate.toFixed(2)),
        isDefault,
      })
      .returning();
  }
  return NextResponse.json({ data: row });
}
