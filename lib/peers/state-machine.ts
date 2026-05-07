import { db } from '@/lib/db';
import { peers, peerStateAudit, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type PeerStatus =
  | 'invited'
  | 'pending_admin_review'
  | 'pending_credentialing'
  | 'active'
  | 'license_expired'
  | 'suspended'
  | 'archived';

export const ALLOWED_TRANSITIONS: Record<PeerStatus, PeerStatus[]> = {
  invited: ['pending_admin_review', 'archived'],
  pending_admin_review: ['pending_credentialing', 'archived'],
  pending_credentialing: ['active', 'archived'],
  active: ['license_expired', 'suspended', 'archived'],
  license_expired: ['active', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const ASSIGNABLE_STATES: readonly PeerStatus[] = ['active'] as const;

export function canTransition(from: PeerStatus, to: PeerStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isAssignable(status: PeerStatus): boolean {
  return (ASSIGNABLE_STATES as readonly string[]).includes(status);
}

export class PeerStateTransitionError extends Error {
  constructor(public from: PeerStatus | null, public to: PeerStatus, msg?: string) {
    super(msg ?? `Disallowed peer status transition: ${from} -> ${to}`);
    this.name = 'PeerStateTransitionError';
  }
}

/**
 * Apply a peer status transition. Validates against ALLOWED_TRANSITIONS.
 *
 * Note: the underlying `db` (neon-http) does not support real transactions,
 * so we issue the three writes (peers update, peer_state_audit insert,
 * audit_logs insert) sequentially and rely on the canTransition() guard
 * before the first write. If the audit inserts fail post-update, the peer
 * status is still authoritative; partial-write failures will surface in logs
 * and can be reconciled from peers.status_changed_at.
 */
export async function transitionPeer(
  peerId: string,
  toStatus: PeerStatus,
  actor: string,
  reason: string
): Promise<void> {
  const [current] = await db
    .select({ status: peers.status })
    .from(peers)
    .where(eq(peers.id, peerId))
    .limit(1);

  if (!current) {
    throw new PeerStateTransitionError(null, toStatus, `Peer not found: ${peerId}`);
  }

  const fromStatus = current.status as PeerStatus;
  if (!canTransition(fromStatus, toStatus)) {
    throw new PeerStateTransitionError(fromStatus, toStatus);
  }

  const now = new Date();
  await db
    .update(peers)
    .set({
      status: toStatus,
      statusChangedAt: now,
      statusChangedBy: actor,
      statusChangeReason: reason,
      updatedAt: now,
    })
    .where(eq(peers.id, peerId));

  await db.insert(peerStateAudit).values({
    peerId,
    fromState: fromStatus,
    toState: toStatus,
    changedBy: actor,
    changeReason: reason,
    changedAt: now,
  });

  await db.insert(auditLogs).values({
    action: 'peer_state_transition',
    resourceType: 'peer',
    resourceId: peerId,
    metadata: { from_status: fromStatus, to_status: toStatus, actor, reason },
  });
}
