import { callClaude } from './anthropic';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { AssignmentResult } from '@/types';

const ASSIGNMENT_SYSTEM_PROMPT = `You are an intelligent case assignment engine for a medical peer review company called Peerspectiv.

Your task is to assign each unassigned case to the most appropriate peer reviewer.

Rules:
1. Specialty MUST match. Never assign a Family Medicine case to a Cardiologist.
2. Workload balance: prefer reviewers with fewer active cases
3. No reviewer should be assigned more than 8 cases total at once
4. Spread cases evenly across specialty-matched reviewers when multiple qualify

You will receive:
- A list of cases (id, specialty_required, provider_name, company_name)
- A list of reviewers (id, full_name, specialty, active_cases_count, board_certification)

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

export async function suggestAssignments(batchId: string): Promise<AssignmentResult> {
  // Fetch unassigned cases in this batch
  const { data: cases } = await supabaseAdmin
    .from('review_cases')
    .select('id, specialty_required, provider:providers(first_name, last_name), company:companies(name)')
    .eq('batch_id', batchId)
    .eq('status', 'unassigned');

  if (!cases || cases.length === 0) {
    return { assignments: [], unassignable: [], summary: 'No unassigned cases found in this batch.' };
  }

  // Fetch active reviewers (exclude unavailable)
  const { data: reviewers } = await supabaseAdmin
    .from('reviewers')
    .select('id, full_name, specialty, active_cases_count, board_certification')
    .eq('status', 'active')
    .eq('availability_status', 'available');

  const casesForAI = cases.map((c: any) => ({
    id: c.id,
    specialty_required: c.specialty_required,
    provider_name: c.provider ? `${(c.provider as any).first_name} ${(c.provider as any).last_name}` : 'Unknown',
    company_name: (c.company as any)?.name || 'Unknown',
  }));

  const userPrompt = `Cases to assign:\n${JSON.stringify(casesForAI, null, 2)}\n\nAvailable reviewers:\n${JSON.stringify(reviewers, null, 2)}`;

  const response = await callClaude(ASSIGNMENT_SYSTEM_PROMPT, userPrompt);

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');

  const result: AssignmentResult = JSON.parse(jsonMatch[0]);

  // Write proposed assignments to DB
  for (const assignment of result.assignments) {
    await supabaseAdmin
      .from('review_cases')
      .update({
        reviewer_id: assignment.reviewer_id,
        status: 'pending_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.case_id);
  }

  return result;
}

export async function approveAssignment(caseId: string): Promise<void> {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  await supabaseAdmin
    .from('review_cases')
    .update({
      status: 'assigned',
      assigned_at: new Date().toISOString(),
      due_date: dueDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId);

  // Increment reviewer active cases
  const { data: caseData } = await supabaseAdmin
    .from('review_cases')
    .select('reviewer_id')
    .eq('id', caseId)
    .single();

  if (caseData?.reviewer_id) {
    const { data: reviewerData } = await supabaseAdmin
      .from('reviewers')
      .select('active_cases_count')
      .eq('id', caseData.reviewer_id)
      .single();

    if (reviewerData) {
      await supabaseAdmin
        .from('reviewers')
        .update({ active_cases_count: (reviewerData.active_cases_count || 0) + 1 })
        .eq('id', caseData.reviewer_id);
    }
  }
}

export async function approveAllAssignments(batchId?: string): Promise<number> {
  const query = supabaseAdmin
    .from('review_cases')
    .select('id')
    .eq('status', 'pending_approval');

  if (batchId) query.eq('batch_id', batchId);

  const { data: cases } = await query;
  if (!cases) return 0;

  for (const c of cases) {
    await approveAssignment(c.id);
  }

  return cases.length;
}
