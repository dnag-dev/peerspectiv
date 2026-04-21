import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auditLog } from '@/lib/utils/audit';
import { randomUUID } from 'crypto';

// Deterministic UUIDs for demo data consistency
function demoId(prefix: string, index: number): string {
  return randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------------------------
    // 1. Seed Companies
    // ---------------------------------------------------------------
    const companies = [
      { name: 'Hunter Health FQHC', contact_person: 'Maria Gonzalez', contact_email: 'mgonzalez@hunterhealth.org', contact_phone: '316-262-2415', status: 'active' as const },
      { name: 'GraceMed Health Clinic', contact_person: 'James Whitfield', contact_email: 'jwhitfield@gracemed.org', contact_phone: '316-866-2000', status: 'active' as const },
      { name: 'HealthCore Clinic', contact_person: 'Priya Patel', contact_email: 'ppatel@healthcore.org', contact_phone: '316-691-0249', status: 'active' as const },
    ];

    const { data: insertedCompanies, error: companyErr } = await supabaseAdmin
      .from('companies')
      .upsert(companies, { onConflict: 'name' })
      .select();

    if (companyErr) {
      return NextResponse.json(
        { error: `Failed to seed companies: ${companyErr.message}`, code: 'SEED_FAILED' },
        { status: 500 }
      );
    }

    const companyMap = Object.fromEntries(
      (insertedCompanies || []).map((c: any) => [c.name, c.id])
    );

    // ---------------------------------------------------------------
    // 2. Seed Providers
    // ---------------------------------------------------------------
    const providers = [
      { company_id: companyMap['Hunter Health FQHC'], first_name: 'Marissa', last_name: 'Backhaus', specialty: 'Family Medicine', npi: '1234567890', status: 'active' as const },
      { company_id: companyMap['Hunter Health FQHC'], first_name: 'Robert', last_name: 'Chen', specialty: 'Internal Medicine', npi: '2345678901', status: 'active' as const },
      { company_id: companyMap['GraceMed Health Clinic'], first_name: 'Sarah', last_name: 'Williams', specialty: 'Pediatrics', npi: '3456789012', status: 'active' as const },
      { company_id: companyMap['GraceMed Health Clinic'], first_name: 'David', last_name: 'Kumar', specialty: 'Family Medicine', npi: '4567890123', status: 'active' as const },
      { company_id: companyMap['HealthCore Clinic'], first_name: 'Lisa', last_name: 'Thompson', specialty: 'Internal Medicine', npi: '5678901234', status: 'active' as const },
      { company_id: companyMap['HealthCore Clinic'], first_name: 'Michael', last_name: 'Rivera', specialty: 'Pediatrics', npi: '6789012345', status: 'active' as const },
      { company_id: companyMap['HealthCore Clinic'], first_name: 'Jennifer', last_name: 'Okafor', specialty: 'Family Medicine', npi: '7890123456', status: 'active' as const },
    ];

    const { data: insertedProviders, error: providerErr } = await supabaseAdmin
      .from('providers')
      .upsert(providers, { onConflict: 'npi' })
      .select();

    if (providerErr) {
      return NextResponse.json(
        { error: `Failed to seed providers: ${providerErr.message}`, code: 'SEED_FAILED' },
        { status: 500 }
      );
    }

    const providersByName = Object.fromEntries(
      (insertedProviders || []).map((p: any) => [`${p.first_name} ${p.last_name}`, p.id])
    );

    // ---------------------------------------------------------------
    // 3. Seed Reviewers
    // ---------------------------------------------------------------
    const reviewers = [
      { full_name: 'Dr. Angela Martinez', email: 'amartinez@peerspectiv.com', specialty: 'Family Medicine', board_certification: 'ABFM', active_cases_count: 0, status: 'active' as const, total_reviews_completed: 12, ai_agreement_score: 87.5 },
      { full_name: 'Dr. James Patterson', email: 'jpatterson@peerspectiv.com', specialty: 'Internal Medicine', board_certification: 'ABIM', active_cases_count: 0, status: 'active' as const, total_reviews_completed: 8, ai_agreement_score: 91.2 },
      { full_name: 'Dr. Priya Sharma', email: 'psharma@peerspectiv.com', specialty: 'Pediatrics', board_certification: 'ABP', active_cases_count: 0, status: 'active' as const, total_reviews_completed: 15, ai_agreement_score: 82.0 },
      { full_name: 'Dr. William Chen', email: 'wchen@peerspectiv.com', specialty: 'Family Medicine', board_certification: 'ABFM', active_cases_count: 0, status: 'active' as const, total_reviews_completed: 6, ai_agreement_score: 94.3 },
    ];

    const { data: insertedReviewers, error: reviewerErr } = await supabaseAdmin
      .from('reviewers')
      .upsert(reviewers, { onConflict: 'email' })
      .select();

    if (reviewerErr) {
      return NextResponse.json(
        { error: `Failed to seed reviewers: ${reviewerErr.message}`, code: 'SEED_FAILED' },
        { status: 500 }
      );
    }

    const reviewersByName = Object.fromEntries(
      (insertedReviewers || []).map((r: any) => [r.full_name, r.id])
    );

    // ---------------------------------------------------------------
    // 4. Seed Batches (3 with varying states)
    // ---------------------------------------------------------------
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const batches = [
      {
        batch_name: 'Hunter Health Q1 2026',
        company_id: companyMap['Hunter Health FQHC'],
        date_uploaded: twoWeeksAgo.toISOString(),
        total_cases: 8,
        assigned_cases: 8,
        completed_cases: 5,
        status: 'in_progress' as const,
      },
      {
        batch_name: 'GraceMed March 2026',
        company_id: companyMap['GraceMed Health Clinic'],
        date_uploaded: weekAgo.toISOString(),
        total_cases: 6,
        assigned_cases: 4,
        completed_cases: 0,
        status: 'in_progress' as const,
      },
      {
        batch_name: 'HealthCore New Upload',
        company_id: companyMap['HealthCore Clinic'],
        date_uploaded: now.toISOString(),
        total_cases: 6,
        assigned_cases: 0,
        completed_cases: 0,
        status: 'pending' as const,
      },
    ];

    const { data: insertedBatches, error: batchErr } = await supabaseAdmin
      .from('batches')
      .insert(batches)
      .select();

    if (batchErr) {
      return NextResponse.json(
        { error: `Failed to seed batches: ${batchErr.message}`, code: 'SEED_FAILED' },
        { status: 500 }
      );
    }

    const batchIds = (insertedBatches || []).map((b: any) => b.id);

    // ---------------------------------------------------------------
    // 5. Seed Review Cases (20 across the batches)
    // ---------------------------------------------------------------
    const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const pastDueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const reviewCases = [
      // Batch 1 - Hunter Health (8 cases: 5 completed, 2 in_progress, 1 past_due)
      { batch_id: batchIds[0], provider_id: providersByName['Marissa Backhaus'], reviewer_id: reviewersByName['Dr. Angela Martinez'], company_id: companyMap['Hunter Health FQHC'], status: 'completed', ai_analysis_status: 'complete', specialty_required: 'Family Medicine', due_date: dueDate, assigned_at: weekAgo.toISOString() },
      { batch_id: batchIds[0], provider_id: providersByName['Marissa Backhaus'], reviewer_id: reviewersByName['Dr. Angela Martinez'], company_id: companyMap['Hunter Health FQHC'], status: 'completed', ai_analysis_status: 'complete', specialty_required: 'Family Medicine', due_date: dueDate, assigned_at: weekAgo.toISOString() },
      { batch_id: batchIds[0], provider_id: providersByName['Robert Chen'], reviewer_id: reviewersByName['Dr. James Patterson'], company_id: companyMap['Hunter Health FQHC'], status: 'completed', ai_analysis_status: 'complete', specialty_required: 'Internal Medicine', due_date: dueDate, assigned_at: weekAgo.toISOString() },
      { batch_id: batchIds[0], provider_id: providersByName['Robert Chen'], reviewer_id: reviewersByName['Dr. James Patterson'], company_id: companyMap['Hunter Health FQHC'], status: 'completed', ai_analysis_status: 'complete', specialty_required: 'Internal Medicine', due_date: dueDate, assigned_at: weekAgo.toISOString() },
      { batch_id: batchIds[0], provider_id: providersByName['Marissa Backhaus'], reviewer_id: reviewersByName['Dr. William Chen'], company_id: companyMap['Hunter Health FQHC'], status: 'completed', ai_analysis_status: 'complete', specialty_required: 'Family Medicine', due_date: dueDate, assigned_at: weekAgo.toISOString() },
      { batch_id: batchIds[0], provider_id: providersByName['Robert Chen'], reviewer_id: reviewersByName['Dr. James Patterson'], company_id: companyMap['Hunter Health FQHC'], status: 'in_progress', ai_analysis_status: 'complete', specialty_required: 'Internal Medicine', due_date: dueDate, assigned_at: weekAgo.toISOString() },
      { batch_id: batchIds[0], provider_id: providersByName['Marissa Backhaus'], reviewer_id: reviewersByName['Dr. Angela Martinez'], company_id: companyMap['Hunter Health FQHC'], status: 'in_progress', ai_analysis_status: 'complete', specialty_required: 'Family Medicine', due_date: dueDate, assigned_at: weekAgo.toISOString() },
      { batch_id: batchIds[0], provider_id: providersByName['Robert Chen'], reviewer_id: reviewersByName['Dr. James Patterson'], company_id: companyMap['Hunter Health FQHC'], status: 'past_due', ai_analysis_status: 'complete', specialty_required: 'Internal Medicine', due_date: pastDueDate, assigned_at: twoWeeksAgo.toISOString() },

      // Batch 2 - GraceMed (6 cases: 2 assigned, 2 pending_approval, 2 unassigned)
      { batch_id: batchIds[1], provider_id: providersByName['Sarah Williams'], reviewer_id: reviewersByName['Dr. Priya Sharma'], company_id: companyMap['GraceMed Health Clinic'], status: 'assigned', ai_analysis_status: 'complete', specialty_required: 'Pediatrics', due_date: dueDate, assigned_at: now.toISOString() },
      { batch_id: batchIds[1], provider_id: providersByName['David Kumar'], reviewer_id: reviewersByName['Dr. Angela Martinez'], company_id: companyMap['GraceMed Health Clinic'], status: 'assigned', ai_analysis_status: 'complete', specialty_required: 'Family Medicine', due_date: dueDate, assigned_at: now.toISOString() },
      { batch_id: batchIds[1], provider_id: providersByName['Sarah Williams'], reviewer_id: reviewersByName['Dr. Priya Sharma'], company_id: companyMap['GraceMed Health Clinic'], status: 'pending_approval', ai_analysis_status: 'complete', specialty_required: 'Pediatrics' },
      { batch_id: batchIds[1], provider_id: providersByName['David Kumar'], reviewer_id: reviewersByName['Dr. William Chen'], company_id: companyMap['GraceMed Health Clinic'], status: 'pending_approval', ai_analysis_status: 'complete', specialty_required: 'Family Medicine' },
      { batch_id: batchIds[1], provider_id: providersByName['Sarah Williams'], company_id: companyMap['GraceMed Health Clinic'], status: 'unassigned', ai_analysis_status: 'complete', specialty_required: 'Pediatrics' },
      { batch_id: batchIds[1], provider_id: providersByName['David Kumar'], company_id: companyMap['GraceMed Health Clinic'], status: 'unassigned', ai_analysis_status: 'pending', specialty_required: 'Family Medicine' },

      // Batch 3 - HealthCore (6 cases: all unassigned, mixed AI status)
      { batch_id: batchIds[2], provider_id: providersByName['Lisa Thompson'], company_id: companyMap['HealthCore Clinic'], status: 'unassigned', ai_analysis_status: 'pending', specialty_required: 'Internal Medicine' },
      { batch_id: batchIds[2], provider_id: providersByName['Michael Rivera'], company_id: companyMap['HealthCore Clinic'], status: 'unassigned', ai_analysis_status: 'pending', specialty_required: 'Pediatrics' },
      { batch_id: batchIds[2], provider_id: providersByName['Jennifer Okafor'], company_id: companyMap['HealthCore Clinic'], status: 'unassigned', ai_analysis_status: 'processing', specialty_required: 'Family Medicine' },
      { batch_id: batchIds[2], provider_id: providersByName['Lisa Thompson'], company_id: companyMap['HealthCore Clinic'], status: 'unassigned', ai_analysis_status: 'pending', specialty_required: 'Internal Medicine' },
      { batch_id: batchIds[2], provider_id: providersByName['Jennifer Okafor'], company_id: companyMap['HealthCore Clinic'], status: 'unassigned', ai_analysis_status: 'pending', specialty_required: 'Family Medicine' },
      { batch_id: batchIds[2], provider_id: providersByName['Michael Rivera'], company_id: companyMap['HealthCore Clinic'], status: 'unassigned', ai_analysis_status: 'pending', specialty_required: 'Pediatrics' },
    ];

    const { data: insertedCases, error: casesErr } = await supabaseAdmin
      .from('review_cases')
      .insert(reviewCases)
      .select();

    if (casesErr) {
      return NextResponse.json(
        { error: `Failed to seed cases: ${casesErr.message}`, code: 'SEED_FAILED' },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------------
    // 6. Seed AI Analyses (5 realistic analyses for completed/in_progress cases)
    // ---------------------------------------------------------------
    const completedCaseIds = (insertedCases || [])
      .filter((c: any) => c.ai_analysis_status === 'complete')
      .slice(0, 5)
      .map((c: any) => c.id);

    const sampleCriteriaScores = [
      { criterion: 'Appropriateness of diagnosis', score: 3, score_label: 'Meets Standard', rationale: 'Diagnosis of T2DM and HTN is well-supported by lab values and clinical presentation.', ai_flag: false, flag_reason: null },
      { criterion: 'Appropriateness of treatment plan', score: 3, score_label: 'Meets Standard', rationale: 'Medication adjustments are appropriate given rising HbA1c and uncontrolled BP.', ai_flag: false, flag_reason: null },
      { criterion: 'Medication appropriateness and safety', score: 3, score_label: 'Meets Standard', rationale: 'Glipizide addition is reasonable; hypoglycemia counseling documented.', ai_flag: false, flag_reason: null },
      { criterion: 'Documentation completeness', score: 2, score_label: 'Partially Meets', rationale: 'Social history update missing; no documentation of BMI counseling specifics.', ai_flag: true, flag_reason: 'Documentation gap identified in social history and BMI counseling.' },
      { criterion: 'Preventive care and screenings', score: 3, score_label: 'Meets Standard', rationale: 'Diabetic foot exam performed, eye exam referral placed, flu vaccine administered.', ai_flag: false, flag_reason: null },
      { criterion: 'Follow-up planning and care coordination', score: 4, score_label: 'Exceeds Standard', rationale: 'Excellent follow-up plan with 2-week BP check and 3-month comprehensive visit. Referrals to diabetes educator and nutrition program.', ai_flag: false, flag_reason: null },
      { criterion: 'Patient education documented', score: 3, score_label: 'Meets Standard', rationale: 'Education on medication compliance and hypoglycemia documented. Patient understanding confirmed.', ai_flag: false, flag_reason: null },
      { criterion: 'Adherence to clinical guidelines', score: 3, score_label: 'Meets Standard', rationale: 'Treatment follows ADA and JNC 8 guidelines for diabetic patients.', ai_flag: false, flag_reason: null },
    ];

    const sampleDeficiencies = [
      { type: 'Documentation' as const, severity: 'Minor' as const, description: 'Social history not updated at this visit', chart_citation: 'HPI section - no mention of tobacco, alcohol, or drug use update', recommendation: 'Update social history at least annually per HRSA guidelines' },
      { type: 'Documentation' as const, severity: 'Minor' as const, description: 'BMI counseling specifics not documented', chart_citation: 'Plan section item 4 - mentions weight management but no specific targets', recommendation: 'Document specific BMI goal and timeline for weight reduction' },
    ];

    const aiAnalyses = completedCaseIds.map((caseId: any, idx: any) => ({
      case_id: caseId,
      chart_summary: `Quarterly follow-up for a patient with Type 2 Diabetes (HbA1c 8.2%, rising) and hypertension (148/92). Provider appropriately intensified therapy with medication adjustments and specialist referrals. Documentation meets most FQHC standards with minor gaps.`,
      criteria_scores: sampleCriteriaScores.map((s) => ({
        ...s,
        score: Math.max(1, s.score + (idx % 2 === 0 ? 0 : -1)),
      })),
      deficiencies: sampleDeficiencies,
      overall_score: 78 + idx * 3,
      documentation_score: 72 + idx * 2,
      clinical_appropriateness_score: 85 + idx,
      care_coordination_score: 90 - idx,
      narrative_draft: `I reviewed the chart for this quarterly diabetes and hypertension follow-up visit. The provider demonstrated appropriate clinical decision-making by recognizing the rising HbA1c and adjusting the treatment plan accordingly. The addition of glipizide and dose increases for lisinopril and atorvastatin align with current ADA and JNC 8 guidelines.\n\nThe documentation is generally thorough, with a complete physical exam, relevant lab review, and a detailed multi-point care plan. However, there are minor documentation gaps: the social history was not updated, and BMI counseling specifics were not recorded.\n\nPreventive care was well-addressed with a diabetic foot exam, eye referral, and flu vaccine. The follow-up plan is excellent, including both a short-term BP recheck and a comprehensive 3-month visit.\n\nOverall, this encounter meets the standard of care expected for an FQHC. The provider should focus on ensuring social history updates and documenting specific counseling targets for weight management.`,
      model_used: 'claude-sonnet-4-5',
      processing_time_ms: 12000 + idx * 1500,
    }));

    if (aiAnalyses.length > 0) {
      const { error: aiErr } = await supabaseAdmin
        .from('ai_analyses')
        .upsert(aiAnalyses, { onConflict: 'case_id' });

      if (aiErr) {
        console.error('[SEED] AI analyses insert error:', aiErr.message);
      }
    }

    // ---------------------------------------------------------------
    // 7. Seed Review Results (3 for completed cases)
    // ---------------------------------------------------------------
    const completedCases = (insertedCases || []).filter((c: any) => c.status === 'completed').slice(0, 3);

    const reviewResults = completedCases.map((c: any, idx: any) => ({
      case_id: c.id,
      reviewer_id: c.reviewer_id,
      criteria_scores: sampleCriteriaScores,
      deficiencies: idx === 0 ? sampleDeficiencies : [],
      overall_score: 80 + idx * 4,
      narrative_final: `I reviewed this clinical encounter chart as part of the FQHC peer review process. The provider demonstrated solid clinical reasoning throughout this diabetes and hypertension follow-up visit. Lab values were appropriately reviewed and medication adjustments were evidence-based.\n\nI agree with the AI's assessment on most criteria. The documentation is adequate but could be strengthened with updated social history and more specific BMI counseling documentation.\n\nThe care coordination and follow-up planning are excellent, with appropriate specialist referrals and a clear return visit schedule. Overall, this represents good quality care consistent with HRSA standards.`,
      ai_agreement_percentage: 75 + idx * 8,
      reviewer_changes: idx > 0 ? [
        { criterion: 'Documentation completeness', ai_score: 2, reviewer_score: 3, reason: 'While documentation could be improved, the overall quality meets the standard for a busy FQHC setting.' },
      ] : [],
      quality_score: 82 + idx * 5,
      quality_notes: idx === 2
        ? 'Thorough review with meaningful clinical insights. Reviewer appropriately adjusted documentation score with well-reasoned justification.'
        : 'Solid review. Reviewer engaged meaningfully with AI suggestions.',
      submitted_at: new Date(now.getTime() - (3 - idx) * 24 * 60 * 60 * 1000).toISOString(),
      time_spent_minutes: 14 + idx * 3,
    }));

    if (reviewResults.length > 0) {
      const { error: resultErr } = await supabaseAdmin
        .from('review_results')
        .upsert(reviewResults, { onConflict: 'case_id' });

      if (resultErr) {
        console.error('[SEED] Review results insert error:', resultErr.message);
      }
    }

    // ---------------------------------------------------------------
    // 8. Update reviewer active_cases_count
    // ---------------------------------------------------------------
    const activeCaseCounts: Record<string, number> = {};
    (insertedCases || []).forEach((c: any) => {
      if (c.reviewer_id && ['assigned', 'in_progress'].includes(c.status)) {
        activeCaseCounts[c.reviewer_id] = (activeCaseCounts[c.reviewer_id] || 0) + 1;
      }
    });

    for (const [reviewerId, count] of Object.entries(activeCaseCounts)) {
      await supabaseAdmin
        .from('reviewers')
        .update({ active_cases_count: count })
        .eq('id', reviewerId);
    }

    // ---------------------------------------------------------------
    // 9. Update batch counts
    // ---------------------------------------------------------------
    for (const batch of insertedBatches || []) {
      const { count: assigned } = await supabaseAdmin
        .from('review_cases')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batch.id)
        .in('status', ['assigned', 'in_progress', 'completed', 'past_due', 'pending_approval']);

      const { count: completed } = await supabaseAdmin
        .from('review_cases')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batch.id)
        .eq('status', 'completed');

      const { count: total } = await supabaseAdmin
        .from('review_cases')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batch.id);

      await supabaseAdmin
        .from('batches')
        .update({
          total_cases: total || 0,
          assigned_cases: assigned || 0,
          completed_cases: completed || 0,
        })
        .eq('id', batch.id);
    }

    await auditLog({
      action: 'demo_data_seeded',
      resourceType: 'system',
      metadata: {
        companies: insertedCompanies?.length || 0,
        providers: insertedProviders?.length || 0,
        reviewers: insertedReviewers?.length || 0,
        batches: insertedBatches?.length || 0,
        cases: insertedCases?.length || 0,
        ai_analyses: aiAnalyses.length,
        review_results: reviewResults.length,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      summary: {
        companies: insertedCompanies?.length || 0,
        providers: insertedProviders?.length || 0,
        reviewers: insertedReviewers?.length || 0,
        batches: insertedBatches?.length || 0,
        cases: insertedCases?.length || 0,
        ai_analyses: aiAnalyses.length,
        review_results: reviewResults.length,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/demo/seed error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
