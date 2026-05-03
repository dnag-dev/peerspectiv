import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { peerSpecialties } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await db
      .select({
        specialty: peerSpecialties.specialty,
        verifiedStatus: peerSpecialties.verifiedStatus,
      })
      .from(peerSpecialties)
      .where(eq(peerSpecialties.peerId, params.id))
      .orderBy(asc(peerSpecialties.specialty));
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[API] GET /api/peers/[id]/specialties error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as { specialty?: string };
    const specialty = (body.specialty ?? '').trim();
    if (!specialty) {
      return NextResponse.json(
        { error: 'specialty is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await db
      .insert(peerSpecialties)
      .values({ peerId: params.id, specialty, verifiedStatus: 'pending' })
      .onConflictDoNothing();

    return NextResponse.json({ data: { peerId: params.id, specialty } });
  } catch (err) {
    console.error('[API] POST /api/peers/[id]/specialties error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as {
      specialty?: string;
      verified_status?: 'verified' | 'not_verified' | 'pending';
    };
    const specialty = (body.specialty ?? '').trim();
    const verified_status = body.verified_status;
    if (!specialty || !verified_status) {
      return NextResponse.json(
        { error: 'specialty and verified_status are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!['verified', 'not_verified', 'pending'].includes(verified_status)) {
      return NextResponse.json(
        { error: 'verified_status must be verified | not_verified | pending', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await db
      .update(peerSpecialties)
      .set({
        verifiedStatus: verified_status,
        verifiedAt: verified_status === 'verified' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(peerSpecialties.peerId, params.id),
          eq(peerSpecialties.specialty, specialty)
        )
      );

    return NextResponse.json({ data: { peerId: params.id, specialty, verified_status } });
  } catch (err) {
    console.error('[API] PATCH /api/peers/[id]/specialties error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const specialty = (url.searchParams.get('specialty') ?? '').trim();
    if (!specialty) {
      return NextResponse.json(
        { error: 'specialty query param required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await db
      .delete(peerSpecialties)
      .where(
        and(
          eq(peerSpecialties.peerId, params.id),
          eq(peerSpecialties.specialty, specialty)
        )
      );

    return NextResponse.json({ data: { removed: specialty } });
  } catch (err) {
    console.error('[API] DELETE /api/peers/[id]/specialties error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
