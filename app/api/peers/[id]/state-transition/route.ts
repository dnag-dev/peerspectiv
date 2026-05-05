import { NextRequest, NextResponse } from 'next/server';
import { transitionPeer, PeerStateTransitionError, type PeerState } from '@/lib/peers/state-machine';
import { db } from '@/lib/db';
import { reviewCases } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { toState: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { toState, reason } = body;
  if (!toState) {
    return NextResponse.json({ error: 'toState is required' }, { status: 400 });
  }

  const validStates: PeerState[] = [
    'invited', 'pending_admin_review', 'pending_credentialing',
    'active', 'license_expired', 'suspended', 'archived',
  ];
  if (!validStates.includes(toState as PeerState)) {
    return NextResponse.json({ error: `Invalid state: ${toState}` }, { status: 400 });
  }

  // Require reason for suspend and archive transitions
  if ((toState === 'suspended' || toState === 'archived') && !reason?.trim()) {
    return NextResponse.json({ error: 'Reason is required for this transition' }, { status: 400 });
  }

  // Resolve actor from demo cookie or Clerk
  let actor = 'admin';
  const cookieRaw = req.cookies.get('demo_user')?.value;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed?.email) actor = parsed.email;
    } catch { /* ignore */ }
  }

  // SA-030: Block archive/suspend if peer has active assignments
  if (toState === 'archived' || toState === 'suspended') {
    const activeCases = await db
      .select({ id: reviewCases.id })
      .from(reviewCases)
      .where(
        and(
          eq(reviewCases.peerId, params.id),
          inArray(reviewCases.status, ['assigned', 'in_progress'])
        )
      )
      .limit(1);
    if (activeCases.length > 0) {
      return NextResponse.json(
        { error: `Cannot ${toState === 'archived' ? 'archive' : 'suspend'} peer with active assignments. Reassign their cases first.` },
        { status: 409 }
      );
    }
  }

  try {
    await transitionPeer(params.id, toState as PeerState, actor, reason?.trim() || '');
    return NextResponse.json({ ok: true, state: toState });
  } catch (err) {
    if (err instanceof PeerStateTransitionError) {
      return NextResponse.json(
        { error: err.message, from: err.from, to: err.to },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Transition failed' }, { status: 500 });
  }
}
