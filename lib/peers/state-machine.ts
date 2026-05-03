import { db } from '@/lib/db';
import { peers, peerStateAudit, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type PeerState =
  | 'invited'
  | 'pending_admin_review'
  | 'pending_credentialing'
  | 'active'
  | 'license_expired'
  | 'suspended'
  | 'archived';

export const ALLOWED_TRANSITIONS: Record<PeerState, PeerState[]> = {
  invited: ['pending_admin_review', 'archived'],
  pending_admin_review: ['pending_credentialing', 'archived'],
  pending_credentialing: ['active', 'archived'],
  active: ['license_expired', 'suspended', 'archived'],
  license_expired: ['active', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const ASSIGNABLE_STATES: readonly PeerState[] = ['active'] as const;

export function canTransition(from: PeerState, to: PeerState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isAssignable(state: PeerState): boolean {
  return (ASSIGNABLE_STATES as readonly string[]).includes(state);
}

export class PeerStateTransitionError extends Error {
  constructor(public from: PeerState | null, public to: PeerState, msg?: string) {
    super(msg ?? `Disallowed peer state transition: ${from} -> ${to}`);
    this.name = 'PeerStateTransitionError';
  }
}

/**
 * Apply a peer state transition. Validates against ALLOWED_TRANSITIONS.
 *
 * Note: the underlying `db` (neon-http) does not support real transactions,
 * so we issue the three writes (peers update, peer_state_audit insert,
 * audit_logs insert) sequentially and rely on the canTransition() guard
 * before the first write. If the audit inserts fail post-update, the peer
 * state is still authoritative; partial-write failures will surface in logs
 * and can be reconciled from peers.state_changed_at.
 */
export async function transitionPeer(
  peerId: string,
  toState: PeerState,
  actor: string,
  reason: string
): Promise<void> {
  const [current] = await db
    .select({ state: peers.state })
    .from(peers)
    .where(eq(peers.id, peerId))
    .limit(1);

  if (!current) {
    throw new PeerStateTransitionError(null, toState, `Peer not found: ${peerId}`);
  }

  const fromState = current.state as PeerState;
  if (!canTransition(fromState, toState)) {
    throw new PeerStateTransitionError(fromState, toState);
  }

  const now = new Date();
  await db
    .update(peers)
    .set({
      state: toState,
      stateChangedAt: now,
      stateChangedBy: actor,
      stateChangeReason: reason,
      updatedAt: now,
    })
    .where(eq(peers.id, peerId));

  await db.insert(peerStateAudit).values({
    peerId,
    fromState,
    toState,
    changedBy: actor,
    changeReason: reason,
    changedAt: now,
  });

  await db.insert(auditLogs).values({
    action: 'peer_state_transition',
    resourceType: 'peer',
    resourceId: peerId,
    metadata: { from_state: fromState, to_state: toState, actor, reason },
  });
}
