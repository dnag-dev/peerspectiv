import { callClaude } from './anthropic';
import { db } from '@/lib/db';
import { reviewCases, peers, providers, companies } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import type { AssignmentResult } from '@/types';

const ASSIGNMENT_SYSTEM_PROMPT = `You are an intelligent case assignment engine for a medical peer review company called Peerspectiv.

Your task is to assign each unassigned case to the most appropriate peer reviewer.

Rules:
1. Specialty MUST match. Never assign a Family Medicine case to a Cardiologist.
2. Workload balance: prefer reviewers with fewer active cases.
3. Efficiency-aware: prefer reviewers with lower avg_minutes_per_chart when available.
4. Capacity: never assign beyond a reviewer's max_case_load (active_cases_count + new <= max_case_load).
5. Spread cases evenly across specialty-matched reviewers when multiple qualify.

You will receive:
- A list of cases (id, specialty_required, provider_name, company_name)
- A list of reviewers (id, full_name, specialties, active_cases_count, max_case_load, avg_minutes_per_chart, total_reviews_completed, board_certification)
  Reviewers are pre-sorted preferred-first (low workload, fast, experienced).

Return ONLY valid JSON in this exact format:
{
  "assignments": [
    {
      "case_id": "...",
      "reviewer_id": "...",
      "reviewer_name": "...",
      "specialty_match": "...",
      "rationale": "One sentence explaining why this reviewer was chosen",
      "confidence": 95
    }
  ],
  "unassignable": [
    {
      "case_id": "...",
      "reason": "No reviewer available for this specialty"
    }
  ],
  "summary": "Brief plain-English summary of the assignments made"
}`;

interface ReviewerRow {
  id: string;
  full_name: string | null;
  specialty: string | null;
  specialties: string[] | null;
  active_cases_count: number | null;
  max_case_load: number | null;
  avg_minutes_per_chart: string | number | null;
  total_reviews_completed: number | null;
  board_certification: string | null;
  credential_valid_until: string | null;
}

export async function suggestAssignments(batchId: string): Promise<AssignmentResult> {
  // Fetch unassigned cases in this batch
  const cases = await db.query.reviewCases.findMany({
    where: and(eq(reviewCases.batchId, batchId), eq(reviewCases.status, 'unassigned')),
    columns: { id: true, specialtyRequired: true },
    with: {
      provider: { columns: { firstName: true, lastName: true } },
      company: { columns: { name: true } },
    },
  });

  if (!cases || cases.length === 0) {
    return { assignments: [], unassignable: [], summary: 'No unassigned cases found in this batch.' };
  }

  // Fetch active reviewers (exclude unavailable). We pull all and filter
  // capacity/credential in JS so we can also build the unassignable reasons.
  const reviewersRaw = await db
    .select({
      id: peers.id,
      full_name: peers.fullName,
      specialty: peers.specialty,
      specialties: peers.specialties,
      active_cases_count: peers.activeCasesCount,
      max_case_load: peers.maxCaseLoad,
      avg_minutes_per_chart: peers.avgMinutesPerChart,
      total_reviews_completed: peers.totalReviewsCompleted,
      board_certification: peers.boardCertification,
      credential_valid_until: peers.credentialValidUntil,
    })
    .from(peers)
    .where(and(eq(peers.status, 'active'), eq(peers.availabilityStatus, 'available')));

  const allPeers = reviewersRaw as ReviewerRow[];
  const today = new Date().toISOString().slice(0, 10);

  // Credentialed + capacity filter
  const eligible = allPeers.filter((r) => {
    if (!r.credential_valid_until) return false;
    if (String(r.credential_valid_until).slice(0, 10) < today) return false;
    const active = Number(r.active_cases_count ?? 0);
    const cap = Number(r.max_case_load ?? 75);
    return active < cap;
  });

  // Sort preference-first
  const sorted = [...eligible].sort((a, b) => {
    const aa = Number(a.active_cases_count ?? 0);
    const bb = Number(b.active_cases_count ?? 0);
    if (aa !== bb) return aa - bb;
    const am = a.avg_minutes_per_chart == null ? Number.POSITIVE_INFINITY : Number(a.avg_minutes_per_chart);
    const bm = b.avg_minutes_per_chart == null ? Number.POSITIVE_INFINITY : Number(b.avg_minutes_per_chart);
    if (am !== bm) return am - bm;
    const at = Number(a.total_reviews_completed ?? 0);
    const bt = Number(b.total_reviews_completed ?? 0);
    return bt - at;
  });

  const casesForAI = cases.map((c) => ({
    id: c.id,
    specialty_required: c.specialtyRequired,
    provider_name: c.provider ? `${c.provider.firstName} ${c.provider.lastName}` : 'Unknown',
    company_name: c.company?.name || 'Unknown',
  }));

  const reviewersForAI = sorted.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    specialties: Array.isArray(r.specialties) && r.specialties.length > 0
      ? r.specialties
      : r.specialty
        ? [r.specialty]
        : [],
    active_cases_count: Number(r.active_cases_count ?? 0),
    max_case_load: Number(r.max_case_load ?? 75),
    avg_minutes_per_chart: r.avg_minutes_per_chart == null ? null : Number(r.avg_minutes_per_chart),
    total_reviews_completed: Number(r.total_reviews_completed ?? 0),
    board_certification: r.board_certification,
  }));

  const N = cases.length;
  const M = Math.max(1, reviewersForAI.length);
  const evenShare = Math.ceil(N / M);
  const spreadingHint = `\n\nSpreading rule: aim to assign each reviewer no more than min(max_case_load - active_cases_count, ${evenShare}) cases from this batch before moving to the next reviewer.`;

  const userPrompt = `Cases to assign:\n${JSON.stringify(casesForAI, null, 2)}\n\nAvailable reviewers (preferred first):\n${JSON.stringify(reviewersForAI, null, 2)}${spreadingHint}`;

  let result: AssignmentResult;
  if (reviewersForAI.length === 0) {
    const reason = allPeers.length === 0
      ? 'No reviewers available'
      : 'All reviewers blocked (missing/expired credential or at capacity)';
    return {
      assignments: [],
      unassignable: cases.map((c) => ({ case_id: c.id, reason })),
      summary: reason,
    };
  } else {
    const response = await callClaude(ASSIGNMENT_SYSTEM_PROMPT, userPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');
    result = JSON.parse(jsonMatch[0]);
  }

  // Annotate unassignable with capacity reason for any over-cap reviewers
  const overCap = allPeers.filter((r) => {
    const active = Number(r.active_cases_count ?? 0);
    const cap = Number(r.max_case_load ?? 75);
    return active >= cap;
  });
  if (overCap.length > 0 && result.unassignable) {
    for (const u of result.unassignable) {
      if (!u.reason || /no reviewer/i.test(u.reason)) {
        const targetCase = cases.find((c) => c.id === u.case_id);
        if (targetCase) {
          const matched = overCap.find((r) => {
            const specs = Array.isArray(r.specialties) && r.specialties.length > 0
              ? r.specialties
              : r.specialty
                ? [r.specialty]
                : [];
            return specs.includes(targetCase.specialtyRequired ?? '');
          });
          if (matched) {
            u.reason = `Reviewer at capacity (${matched.full_name})`;
          }
        }
      }
    }
  }

  // Write proposed assignments to DB
  for (const assignment of result.assignments) {
    await db
      .update(reviewCases)
      .set({
        peerId: assignment.peer_id,
        status: 'pending_approval',
        updatedAt: new Date(),
      })
      .where(eq(reviewCases.id, assignment.case_id));
  }

  return result;
}

export async function approveAssignment(caseId: string): Promise<void> {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  await db
    .update(reviewCases)
    .set({
      status: 'assigned',
      assignedAt: new Date(),
      dueDate,
      updatedAt: new Date(),
    })
    .where(eq(reviewCases.id, caseId));

  // Increment reviewer active cases
  const [caseData] = await db
    .select({ peerId: reviewCases.peerId })
    .from(reviewCases)
    .where(eq(reviewCases.id, caseId))
    .limit(1);

  if (caseData?.peerId) {
    const [peerData] = await db
      .select({ activeCasesCount: peers.activeCasesCount })
      .from(peers)
      .where(eq(peers.id, caseData.peerId))
      .limit(1);

    if (peerData) {
      await db
        .update(peers)
        .set({ activeCasesCount: (peerData.activeCasesCount || 0) + 1 })
        .where(eq(peers.id, caseData.peerId));
    }
  }
}

export async function approveAllAssignments(batchId?: string): Promise<number> {
  const conditions = [eq(reviewCases.status, 'pending_approval')];
  if (batchId) conditions.push(eq(reviewCases.batchId, batchId));

  const cases = await db
    .select({ id: reviewCases.id })
    .from(reviewCases)
    .where(and(...conditions));

  for (const c of cases) {
    await approveAssignment(c.id);
  }

  return cases.length;
}
