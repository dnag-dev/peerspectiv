/**
 * Phase 5.1 — pure assignment-picker spec.
 *
 * Headline scenario: 30 Dental cases × 3 Dental peers with free caps
 * 10/7/13 → exact 10/7/13 split, no peer over max, no case unassigned.
 */
import { describe, it, expect } from 'vitest';
import { pickAssignments, type CaseInput, type PeerCandidate } from './auto-suggest';

function mkCases(n: number, specialty: string, prefix = 'c'): CaseInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    specialty,
    companyId: 'co-1',
  }));
}

function mkPeer(
  id: string,
  specialties: string[],
  freeCapacity: number,
  overrides: Partial<PeerCandidate> = {}
): PeerCandidate {
  return {
    id,
    specialties,
    freeCapacity,
    isActive: true,
    licenseValid: true,
    ...overrides,
  };
}

describe('pickAssignments — capacity-aware split (SA-067I)', () => {
  it('30 Dental cases + 3 peers (10/7/13) splits exactly 10/7/13', () => {
    const cases = mkCases(30, 'Dental');
    const candidates = [
      mkPeer('A', ['Dental'], 10),
      mkPeer('B', ['Dental'], 7),
      mkPeer('C', ['Dental'], 13),
    ];
    const result = pickAssignments(cases, candidates);

    // Every case assigned, none null.
    expect(result.length).toBe(30);
    expect(result.filter((s) => s.peerId === null)).toEqual([]);

    const counts = new Map<string, number>();
    for (const s of result) {
      counts.set(s.peerId!, (counts.get(s.peerId!) ?? 0) + 1);
    }
    expect(counts.get('A')).toBe(10);
    expect(counts.get('B')).toBe(7);
    expect(counts.get('C')).toBe(13);

    // No peer over their declared free capacity (≡ no peer over max_case_load).
    expect(counts.get('A')!).toBeLessThanOrEqual(10);
    expect(counts.get('B')!).toBeLessThanOrEqual(7);
    expect(counts.get('C')!).toBeLessThanOrEqual(13);
  });

  it('skips peers without specialty match', () => {
    const cases = mkCases(3, 'Cardiology');
    const candidates = [
      mkPeer('A', ['Dental'], 50),
      mkPeer('B', ['Cardiology'], 5),
    ];
    const result = pickAssignments(cases, candidates);
    expect(result.every((s) => s.peerId === 'B')).toBe(true);
  });

  it('skips inactive or expired peers', () => {
    const cases = mkCases(2, 'Dental');
    const candidates = [
      mkPeer('inactive', ['Dental'], 10, { isActive: false }),
      mkPeer('expired', ['Dental'], 10, { licenseValid: false }),
      mkPeer('ok', ['Dental'], 10),
    ];
    const result = pickAssignments(cases, candidates);
    expect(result.every((s) => s.peerId === 'ok')).toBe(true);
  });

  it('returns null + reason when no eligible peer exists', () => {
    const cases = mkCases(1, 'Neurology');
    const candidates = [mkPeer('A', ['Dental'], 5)];
    const [s] = pickAssignments(cases, candidates);
    expect(s.peerId).toBeNull();
    expect(s.reason).toMatch(/no eligible peer/i);
  });

  it('does not exceed any peer freeCapacity even when total cases > total free', () => {
    const cases = mkCases(20, 'Dental');
    const candidates = [
      mkPeer('A', ['Dental'], 5),
      mkPeer('B', ['Dental'], 5),
    ];
    const result = pickAssignments(cases, candidates);
    const assigned = result.filter((s) => s.peerId !== null);
    const unassigned = result.filter((s) => s.peerId === null);
    expect(assigned.length).toBe(10);
    expect(unassigned.length).toBe(10);
  });
});
