import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import {
  ALLOWED_TRANSITIONS,
  ASSIGNABLE_STATES,
  PeerStateTransitionError,
  canTransition,
  isAssignable,
  transitionPeer,
  type PeerState,
} from './state-machine';
import { computeFree, getPeerCapacity } from './capacity';

describe('peer state machine — pure transition rules', () => {
  it('every source state allows at least one transition target (except archived)', () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      if (from === 'archived') continue;
      expect(targets.length).toBeGreaterThan(0);
    }
  });

  it('all 7 documented allowed transitions return true', () => {
    const allowed: Array<[PeerState, PeerState]> = [
      ['invited', 'pending_admin_review'],
      ['pending_admin_review', 'pending_credentialing'],
      ['pending_credentialing', 'active'],
      ['active', 'license_expired'],
      ['active', 'suspended'],
      ['license_expired', 'active'],
      ['suspended', 'active'],
    ];
    for (const [from, to] of allowed) {
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it('every state can transition to archived (except archived itself)', () => {
    const fromStates: PeerState[] = [
      'invited',
      'pending_admin_review',
      'pending_credentialing',
      'active',
      'license_expired',
      'suspended',
    ];
    for (const f of fromStates) {
      expect(canTransition(f, 'archived')).toBe(true);
    }
  });

  it('archived is terminal — no outbound transitions', () => {
    const targets: PeerState[] = [
      'invited',
      'pending_admin_review',
      'pending_credentialing',
      'active',
      'license_expired',
      'suspended',
    ];
    for (const t of targets) {
      expect(canTransition('archived', t)).toBe(false);
    }
  });

  it('disallowed transitions return false', () => {
    expect(canTransition('invited', 'active')).toBe(false);
    expect(canTransition('invited', 'license_expired')).toBe(false);
    expect(canTransition('pending_credentialing', 'license_expired')).toBe(false);
    expect(canTransition('license_expired', 'pending_credentialing')).toBe(false);
    expect(canTransition('suspended', 'license_expired')).toBe(false);
  });

  it('isAssignable matches ASSIGNABLE_STATES', () => {
    expect(isAssignable('active')).toBe(true);
    expect(isAssignable('invited')).toBe(false);
    expect(isAssignable('archived')).toBe(false);
    expect(ASSIGNABLE_STATES).toEqual(['active']);
  });
});

describe('capacity math — pure', () => {
  it('max=10, load=5 → free=5', () => {
    expect(computeFree(10, 5)).toBe(5);
  });
  it('floors at 0 when load > max', () => {
    expect(computeFree(3, 10)).toBe(0);
  });
  it('max=0 → free=0', () => {
    expect(computeFree(0, 0)).toBe(0);
  });
});

// Integration: real DB writes. Skipped automatically if DATABASE_URL absent.
const hasDb = !!process.env.DATABASE_URL;
const dbDescribe = hasDb ? describe : describe.skip;

dbDescribe('peer state machine — DB-backed', () => {
  let testPeerId: string;
  let dbModule: typeof import('@/lib/db');
  let schemaModule: typeof import('@/lib/db/schema');

  beforeAll(async () => {
    dbModule = await import('@/lib/db');
    schemaModule = await import('@/lib/db/schema');
    const { db } = dbModule;
    const { peers } = schemaModule;

    const [row] = await db
      .insert(peers)
      .values({
        fullName: 'TEST Phase 1.3 SM',
        email: `test-sm-${Date.now()}@example.test`,
        state: 'pending_credentialing',
        status: 'inactive',
      })
      .returning({ id: peers.id });
    testPeerId = row.id;
  });

  afterAll(async () => {
    if (!testPeerId) return;
    const { db } = dbModule;
    const { peers } = schemaModule;
    const { eq } = await import('drizzle-orm');
    await db.delete(peers).where(eq(peers.id, testPeerId));
  });

  it('transitionPeer with disallowed combo throws', async () => {
    // pending_credentialing -> license_expired is not allowed
    await expect(
      transitionPeer(testPeerId, 'license_expired', 'test', 'should fail')
    ).rejects.toThrow(PeerStateTransitionError);
  });

  it('successful transition writes peer_state_audit + audit_logs rows', async () => {
    const { db } = dbModule;
    const { peerStateAudit, auditLogs } = schemaModule;
    const { eq, and, desc } = await import('drizzle-orm');

    await transitionPeer(testPeerId, 'active', 'test_actor', 'test_reason');

    const audits = await db
      .select()
      .from(peerStateAudit)
      .where(eq(peerStateAudit.peerId, testPeerId))
      .orderBy(desc(peerStateAudit.changedAt))
      .limit(1);
    expect(audits.length).toBe(1);
    expect(audits[0].toState).toBe('active');
    expect(audits[0].fromState).toBe('pending_credentialing');
    expect(audits[0].changedBy).toBe('test_actor');

    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceId, testPeerId),
          eq(auditLogs.action, 'peer_state_transition')
        )
      );
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it('getPeerCapacity returns max/load/free', async () => {
    const cap = await getPeerCapacity(testPeerId);
    expect(typeof cap.max).toBe('number');
    expect(typeof cap.load).toBe('number');
    expect(cap.free).toBe(Math.max(0, cap.max - cap.load));
  });
});
