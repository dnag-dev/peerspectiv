import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies, contracts, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import {
  generateServiceAgreementText,
  generateBAAText,
} from '@/lib/contracts/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    // Clerk not configured — fall through
  }
  const demo = req.headers.get('x-demo-user-id');
  if (demo && demo.trim()) return demo.trim();
  const cookieRaw = req.cookies.get('demo_user')?.value;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed?.email) return `demo:${parsed.email}`;
    } catch { /* malformed cookie */ }
  }
  return null;
}

interface PricingResult {
  per_review_rate: number;
  estimated_monthly: number;
  pricing_notes: string;
}

function parsePricingJson(raw: string): PricingResult {
  let text = raw.trim();
  // Strip ```json fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // Find first { ... } block if model wrapped in prose
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  const parsed = JSON.parse(text);
  return {
    per_review_rate: Number(parsed.per_review_rate) || 0,
    estimated_monthly: Number(parsed.estimated_monthly) || 0,
    pricing_notes: String(parsed.pricing_notes || ''),
  };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAdminUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const companyId: string | undefined = body.company_id ?? body.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    if (company.status !== 'lead' && company.status !== 'prospect') {
      return NextResponse.json(
        {
          error: `Company status must be 'prospect' to generate a contract (current: ${company.status})`,
        },
        { status: 400 }
      );
    }

    const annual = company.annualReviewCount ?? 0;
    const cycle = company.reviewCycle ?? 'quarterly';
    const name = company.name;

    // Generate pricing summary via Claude
    const aiRes = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Generate pricing for peer review services. Company: ${name}, ${annual} estimated annual reviews, ${cycle} cycle. Return ONLY JSON: {"per_review_rate": number, "estimated_monthly": number, "pricing_notes": "string"}`,
        },
      ],
    });

    const textBlock = aiRes.content.find((b: any) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'AI did not return pricing' },
        { status: 502 }
      );
    }

    let pricing: PricingResult;
    try {
      pricing = parsePricingJson(textBlock.text);
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Failed to parse pricing JSON', detail: err?.message },
        { status: 502 }
      );
    }

    const effectiveDate = new Date().toISOString().split('T')[0];
    const contactName = company.contactPerson ?? 'Authorized Signatory';
    const contactEmail = company.contactEmail ?? '';

    const serviceAgreementText = generateServiceAgreementText({
      companyName: name,
      contactName,
      address: company.address ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      reviewCycle: cycle,
      estimatedProviders: annual,
      effectiveDate,
    });

    const baaText = generateBAAText({
      companyName: name,
      contactName,
      effectiveDate,
    });

    const [inserted] = await db
      .insert(contracts)
      .values({
        companyId,
        contractType: 'combined',
        status: 'draft',
        sentToEmail: contactEmail,
        sentToName: contactName,
        createdBy: userId,
      })
      .returning();

    // Update company status to contract_sent
    await db
      .update(companies)
      .set({ status: 'contract_sent', contractSentAt: new Date(), updatedAt: new Date() })
      .where(eq(companies.id, companyId));

    await db.insert(auditLogs).values({
      userId: null,
      action: 'contract_generated',
      resourceType: 'contract',
      resourceId: inserted.id,
      metadata: {
        companyId,
        contractId: inserted.id,
        createdBy: userId,
        pricing,
        cycle,
        annualReviewCount: annual,
      },
    });

    return NextResponse.json({
      data: {
        contract: inserted,
        service_agreement_preview:
          serviceAgreementText.slice(0, 500) + '...',
        baa_preview: baaText.slice(0, 300) + '...',
        pricing,
        ready_to_send: true,
      },
    });
  } catch (err: any) {
    console.error('[contracts/generate] error', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
