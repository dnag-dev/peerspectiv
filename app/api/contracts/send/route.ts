import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  companies,
  contracts,
  notifications,
  auditLogs,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createAndSendEnvelope } from '@/lib/docusign/client';
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
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAdminUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const contractId: string | undefined = body.contract_id;
    if (!contractId) {
      return NextResponse.json(
        { error: 'contract_id is required' },
        { status: 400 }
      );
    }

    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }
    if (contract.status !== 'draft') {
      return NextResponse.json(
        {
          error: `Contract status must be 'draft' to send (current: ${contract.status})`,
        },
        { status: 400 }
      );
    }
    if (!contract.companyId) {
      return NextResponse.json(
        { error: 'Contract has no associated company' },
        { status: 400 }
      );
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, contract.companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const signerEmail = contract.sentToEmail || company.contactEmail || '';
    const signerName =
      contract.sentToName || company.contactPerson || 'Authorized Signatory';

    if (!signerEmail) {
      return NextResponse.json(
        { error: 'No signer email available on contract or company' },
        { status: 400 }
      );
    }

    const effectiveDate = new Date().toISOString().split('T')[0];
    const serviceAgreementText = generateServiceAgreementText({
      companyName: company.name,
      contactName: signerName,
      address: company.address ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      reviewCycle: company.reviewCycle ?? 'quarterly',
      estimatedProviders: company.annualReviewCount ?? 0,
      effectiveDate,
    });
    const baaText = generateBAAText({
      companyName: company.name,
      contactName: signerName,
      effectiveDate,
    });

    const { envelopeId } = await createAndSendEnvelope({
      signerEmail,
      signerName,
      companyName: company.name,
      serviceAgreementText,
      baaText,
      contractId: contract.id,
    });

    const now = new Date();

    await db
      .update(contracts)
      .set({
        docusignEnvelopeId: envelopeId,
        status: 'sent',
        sentAt: now,
        updatedAt: now,
      })
      .where(eq(contracts.id, contract.id));

    await db
      .update(companies)
      .set({
        status: 'contract_sent',
        contractSentAt: now,
        docusignEnvelopeId: envelopeId,
        updatedAt: now,
      })
      .where(eq(companies.id, company.id));

    await db.insert(notifications).values({
      userId: userId,
      type: 'contract_sent',
      title: `Contract sent to ${company.name}`,
      body: `Service Agreement and BAA sent to ${signerName} <${signerEmail}>. Envelope: ${envelopeId}`,
      entityType: 'contract',
      entityId: contract.id,
    });

    await db.insert(auditLogs).values({
      userId: null,
      action: 'contract_sent',
      resourceType: 'contract',
      resourceId: contract.id,
      metadata: {
        companyId: company.id,
        envelopeId,
        signerEmail,
        signerName,
        sentBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      envelope_id: envelopeId,
      message: `Contract sent to ${signerName} at ${signerEmail}`,
    });
  } catch (err: any) {
    console.error('[contracts/send] error', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
