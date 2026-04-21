import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies, auditLogs } from '@/lib/db/schema';
import { desc, inArray, eq, and, ne } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const PIPELINE_STATUSES = ['prospect', 'contract_sent', 'contract_signed', 'active'] as const;

async function resolveUserId(): Promise<string> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    // demo mode
  }
  return 'demo-admin';
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(health|clinic|medical|center|care|community|fqhc)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function GET() {
  const rows = await db
    .select()
    .from(companies)
    .where(inArray(companies.status, PIPELINE_STATUSES as unknown as string[]))
    .orderBy(desc(companies.createdAt));

  const grouped: Record<string, any[]> = {
    prospects: [],
    contract_sent: [],
    contract_signed: [],
    active: [],
  };

  for (const row of rows) {
    if (row.status === 'prospect') grouped.prospects.push(row);
    else if (row.status === 'contract_sent') grouped.contract_sent.push(row);
    else if (row.status === 'contract_signed') grouped.contract_signed.push(row);
    else if (row.status === 'active') grouped.active.push(row);
  }

  return NextResponse.json(grouped);
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    name,
    contactPerson,
    contactEmail,
    contactPhone,
    address,
    city,
    state,
    prospectSource,
    annualReviewCount,
    reviewCycle,
    onboardingNotes,
    forceCreate,
  } = body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  const userId = await resolveUserId();

  // Duplicate check
  if (!forceCreate) {
    const normalized = normalizeName(name);
    const stateFilter = state
      ? and(ne(companies.status, 'archived'), eq(companies.state, state))
      : ne(companies.status, 'archived');

    const candidates = await db
      .select({
        id: companies.id,
        name: companies.name,
        city: companies.city,
        state: companies.state,
        status: companies.status,
      })
      .from(companies)
      .where(stateFilter);

    const matches = candidates.filter((c) => {
      if (!c.name) return false;
      const cNorm = normalizeName(c.name);
      if (!cNorm || !normalized) return false;
      return cNorm.includes(normalized) || normalized.includes(cNorm);
    });

    if (matches.length > 0) {
      return NextResponse.json(
        {
          error: 'potential_duplicate',
          message: `Found ${matches.length} possible duplicate${matches.length > 1 ? 's' : ''}. Confirm before creating.`,
          matches,
        },
        { status: 409 }
      );
    }
  }

  const parsedReviewCount =
    annualReviewCount === undefined || annualReviewCount === null || annualReviewCount === ''
      ? null
      : Number(annualReviewCount);

  const [created] = await db
    .insert(companies)
    .values({
      name: name.trim(),
      contactPerson: contactPerson || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      prospectSource: prospectSource || null,
      annualReviewCount: Number.isFinite(parsedReviewCount) ? parsedReviewCount : null,
      reviewCycle: reviewCycle || null,
      onboardingNotes: onboardingNotes || null,
      status: 'prospect',
      createdBy: userId,
    })
    .returning();

  try {
    await db.insert(auditLogs).values({
      action: 'prospect_created',
      resourceType: 'company',
      resourceId: created.id,
      metadata: {
        userId,
        name: created.name,
        state: created.state,
        prospectSource: created.prospectSource,
      },
    });
  } catch {
    // best-effort audit log
  }

  return NextResponse.json(created, { status: 201 });
}
