import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, params.id))
      .limit(1);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ invoice: row });
  } catch (err) {
    console.error('[invoices.id] GET failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const allowed: Record<string, any> = {};
    for (const k of [
      'status',
      'notes',
      'dueDate',
      'paymentLinkUrl',
      'paymentMethod',
      'paidAt',
      'sentAt',
      'viewedAt',
      'taxAmount',
    ]) {
      if (k in body) allowed[k] = body[k];
    }
    const updates: any = { ...allowed, updatedAt: new Date() };
    const [row] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, params.id))
      .returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ invoice: row });
  } catch (err) {
    console.error('[invoices.id] PATCH failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
