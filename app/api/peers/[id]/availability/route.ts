import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';

// PATCH — Set peer as unavailable
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { availability_status, unavailable_from, unavailable_until, unavailable_reason } = body;

    await db
      .update(peers)
      .set({
        availabilityStatus: availability_status,
        unavailableFrom: unavailable_from,
        unavailableUntil: unavailable_until,
        unavailableReason: unavailable_reason,
        updatedAt: new Date(),
      })
      .where(eq(peers.id, id));

    await auditLog({
      action: 'reviewer_set_unavailable',
      resourceType: 'peer',
      resourceId: id,
      metadata: { availability_status, unavailable_from, unavailable_until, unavailable_reason },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] PATCH /api/peers/[id]/availability error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Mark peer as available (reset all fields)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await db
      .update(peers)
      .set({
        availabilityStatus: 'available',
        unavailableFrom: null,
        unavailableUntil: null,
        unavailableReason: null,
        updatedAt: new Date(),
      })
      .where(eq(peers.id, id));

    await auditLog({
      action: 'reviewer_marked_available',
      resourceType: 'peer',
      resourceId: id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] POST /api/peers/[id]/availability error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
