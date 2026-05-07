/**
 * Phase 5.1 — capacity-aware per-file split assignment (SA-067I).
 *
 * Pure helper used by the batch-upload flow after AI auto-tagging assigns a
 * specialty to each case. Spreads cases across specialty-matched, active,
 * credentialed peers using a largest-free-capacity-first heuristic so a 30-
 * case batch with three peers (free caps 10/7/13) splits exactly 10/7/13.
 *
 * The DB-loading variant (`suggestAssignmentsForCases`) is what callers wire
 * into the batch route. The pure `pickAssignments(cases, candidates)` lets
 * unit tests inject candidates without hitting Postgres.
 */
import { db } from '@/lib/db';
import { peers, peerSpecialties, reviewCases } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

export interface CaseInput {
  id: string;
  specialty: string;
  companyId: string;
}

export interface PeerCandidate {
  id: string;
  specialties: string[];
  freeCapacity: number;
  isActive: boolean;
  licenseValid: boolean;
}

export interface Suggestion {
  caseId: string;
  peerId: string | null;
  reason?: string;
}

/**
 * Pure assignment picker. Mutates a copy of `candidates` so callers can
 * inspect their own array unchanged. For each case, filters to eligible
 * peers (active, license valid, specialty match, free > 0), picks the one
 * with the largest current free capacity, and decrements.
 */
export function pickAssignments(
  cases: CaseInput[],
  candidates: PeerCandidate[]
): Suggestion[] {
  const work: PeerCandidate[] = candidates.map((c) => ({
    ...c,
    specialties: [...c.specialties],
  }));
  const out: Suggestion[] = [];

  for (const c of cases) {
    const eligible = work.filter(
      (p) =>
        p.isActive &&
        p.licenseValid &&
        p.freeCapacity > 0 &&
        p.specialties.includes(c.specialty)
    );
    if (eligible.length === 0) {
      out.push({ caseId: c.id, peerId: null, reason: 'no eligible peer with capacity' });
      continue;
    }
    // Largest free capacity first → drains the biggest bucket evenly.
    eligible.sort((a, b) => b.freeCapacity - a.freeCapacity);
    const pick = eligible[0];
    pick.freeCapacity -= 1;
    out.push({ caseId: c.id, peerId: pick.id });
  }
  return out;
}

/**
 * DB-backed wrapper. Loads all status='active' peers with their specialties
 * and current free capacity, then delegates to `pickAssignments`.
 */
export async function suggestAssignmentsForCases(
  cases: CaseInput[]
): Promise<Suggestion[]> {
  if (cases.length === 0) return [];

  const peerRows = await db
    .select({
      id: peers.id,
      status: peers.status,
      maxCaseLoad: peers.maxCaseLoad,
      credentialValidUntil: peers.credentialValidUntil,
    })
    .from(peers)
    .where(eq(peers.status, 'active'));

  if (peerRows.length === 0) {
    return cases.map((c) => ({
      caseId: c.id,
      peerId: null,
      reason: 'no eligible peer with capacity',
    }));
  }

  const peerIds = peerRows.map((p) => p.id);

  // Specialties per peer
  const specRows = await db
    .select({ peerId: peerSpecialties.peerId, specialty: peerSpecialties.specialty })
    .from(peerSpecialties)
    .where(inArray(peerSpecialties.peerId, peerIds));
  const specByPeer = new Map<string, string[]>();
  for (const r of specRows) {
    const arr = specByPeer.get(r.peerId) ?? [];
    arr.push(r.specialty);
    specByPeer.set(r.peerId, arr);
  }

  // Current load (assigned + in_progress + pending_approval) per peer
  const loadRows = await db
    .select({
      peerId: reviewCases.peerId,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewCases)
    .where(
      and(
        inArray(reviewCases.peerId, peerIds),
        inArray(reviewCases.status, ['assigned', 'in_progress', 'pending_approval'])
      )
    )
    .groupBy(reviewCases.peerId);
  const loadByPeer = new Map<string, number>();
  for (const r of loadRows) {
    if (r.peerId) loadByPeer.set(r.peerId, Number(r.count ?? 0));
  }

  const today = new Date().toISOString().slice(0, 10);

  const candidates: PeerCandidate[] = peerRows.map((p) => {
    const max = Number(p.maxCaseLoad ?? 75);
    const load = loadByPeer.get(p.id) ?? 0;
    const licenseValid =
      !!p.credentialValidUntil &&
      String(p.credentialValidUntil).slice(0, 10) >= today;
    return {
      id: p.id,
      specialties: specByPeer.get(p.id) ?? [],
      freeCapacity: Math.max(0, max - load),
      isActive: p.status === 'active',
      licenseValid,
    };
  });

  return pickAssignments(cases, candidates);
}
