import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  companies,
  providers,
  peers,
  batches,
  reviewCases,
  aiAnalyses,
  reviewResults,
} from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------------------------
    // 1. Seed Companies
    // ---------------------------------------------------------------
    const companyRows = [
      { name: 'Hunter Health FQHC', contactPerson: 'Maria Gonzalez', contactEmail: 'mgonzalez@hunterhealth.org', contactPhone: '316-262-2415', status: 'active' },
      { name: 'GraceMed Health Clinic', contactPerson: 'James Whitfield', contactEmail: 'jwhitfield@gracemed.org', contactPhone: '316-866-2000', status: 'active' },
      { name: 'HealthCore Clinic', contactPerson: 'Priya Patel', contactEmail: 'ppatel@healthcore.org', contactPhone: '316-691-0249', status: 'active' },
    ];

    const insertedCompanies: { id: string; name: string }[] = [];
    for (const c of companyRows) {
      const [row] = await db
        .insert(companies)
        .values(c)
        .onConflictDoUpdate({
          target: companies.name,
          set: {
            contactPerson: c.contactPerson,
            contactEmail: c.contactEmail,
            contactPhone: c.contactPhone,
            status: c.status,
          },
        })
        .returning({ id: companies.id, name: companies.name });
      insertedCompanies.push(row);
    }

    const companyMap = Object.fromEntries(insertedCompanies.map((c) => [c.name, c.id]));

    // ---------------------------------------------------------------
    // 2. Seed Providers
    // ---------------------------------------------------------------
    const providerRows = [
      { companyId: companyMap['Hunter Health FQHC'], firstName: 'Marissa', lastName: 'Backhaus', specialty: 'Family Medicine', npi: '1234567890', status: 'active' },
      { companyId: companyMap['Hunter Health FQHC'], firstName: 'Robert', lastName: 'Chen', specialty: 'Internal Medicine', npi: '2345678901', status: 'active' },
      { companyId: companyMap['GraceMed Health Clinic'], firstName: 'Sarah', lastName: 'Williams', specialty: 'Pediatrics', npi: '3456789012', status: 'active' },
      { companyId: companyMap['GraceMed Health Clinic'], firstName: 'David', lastName: 'Kumar', specialty: 'Family Medicine', npi: '4567890123', status: 'active' },
      { companyId: companyMap['HealthCore Clinic'], firstName: 'Lisa', lastName: 'Thompson', specialty: 'Internal Medicine', npi: '5678901234', status: 'active' },
      { companyId: companyMap['HealthCore Clinic'], firstName: 'Michael', lastName: 'Rivera', specialty: 'Pediatrics', npi: '6789012345', status: 'active' },
      { companyId: companyMap['HealthCore Clinic'], firstName: 'Jennifer', lastName: 'Okafor', specialty: 'Family Medicine', npi: '7890123456', status: 'active' },
    ];

    const insertedProviders: { id: string; firstName: string | null; lastName: string | null }[] = [];
    for (const p of providerRows) {
      const [row] = await db
        .insert(providers)
        .values(p)
        .onConflictDoUpdate({
          target: providers.npi,
          set: { companyId: p.companyId, firstName: p.firstName, lastName: p.lastName, specialty: p.specialty, status: p.status },
        })
        .returning({ id: providers.id, firstName: providers.firstName, lastName: providers.lastName });
      insertedProviders.push(row);
    }

    const providersByName = Object.fromEntries(
      insertedProviders.map((p) => [`${p.firstName} ${p.lastName}`, p.id])
    );

    // ---------------------------------------------------------------
    // 3. Seed Reviewers
    // ---------------------------------------------------------------
    const peerRows = [
      { fullName: 'Dr. Angela Martinez', email: 'amartinez@peerspectiv.com', specialty: 'Family Medicine', boardCertification: 'ABFM', activeCasesCount: 0, status: 'active', totalReviewsCompleted: 12, aiAgreementScore: '87.5' },
      { fullName: 'Dr. James Patterson', email: 'jpatterson@peerspectiv.com', specialty: 'Internal Medicine', boardCertification: 'ABIM', activeCasesCount: 0, status: 'active', totalReviewsCompleted: 8, aiAgreementScore: '91.2' },
      { fullName: 'Dr. Priya Sharma', email: 'psharma@peerspectiv.com', specialty: 'Pediatrics', boardCertification: 'ABP', activeCasesCount: 0, status: 'active', totalReviewsCompleted: 15, aiAgreementScore: '82.0' },
      { fullName: 'Dr. William Chen', email: 'wchen@peerspectiv.com', specialty: 'Family Medicine', boardCertification: 'ABFM', activeCasesCount: 0, status: 'active', totalReviewsCompleted: 6, aiAgreementScore: '94.3' },
    ];

    const insertedPeers: { id: string; fullName: string | null }[] = [];
    for (const r of peerRows) {
      const [row] = await db
        .insert(peers)
        .values(r)
        .onConflictDoUpdate({
          target: peers.email,
          set: {
            fullName: r.fullName,
            specialty: r.specialty,
            boardCertification: r.boardCertification,
            status: r.status,
            totalReviewsCompleted: r.totalReviewsCompleted,
            aiAgreementScore: r.aiAgreementScore,
          },
        })
        .returning({ id: peers.id, fullName: peers.fullName });
      insertedPeers.push(row);
    }

    const reviewersByName = Object.fromEntries(
      insertedPeers.map((r) => [r.fullName, r.id])
    );

    // ---------------------------------------------------------------
    // 4. Seed Batches (3 with varying states)
    // ---------------------------------------------------------------
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const batchRows = [
      {
        batchName: 'Hunter Health Q1 2026',
        companyId: companyMap['Hunter Health FQHC'],
        dateUploaded: twoWeeksAgo,
        totalCases: 8,
        assignedCases: 8,
        completedCases: 5,
        status: 'in_progress',
      },
      {
        batchName: 'GraceMed March 2026',
        companyId: companyMap['GraceMed Health Clinic'],
        dateUploaded: weekAgo,
        totalCases: 6,
        assignedCases: 4,
        completedCases: 0,
        status: 'in_progress',
      },
      {
        batchName: 'HealthCore New Upload',
        companyId: companyMap['HealthCore Clinic'],
        dateUploaded: now,
        totalCases: 6,
        assignedCases: 0,
        completedCases: 0,
        status: 'pending',
      },
    ];

    const insertedBatches = await db.insert(batches).values(batchRows).returning();
    const batchIds = insertedBatches.map((b) => b.id);

    // ---------------------------------------------------------------
    // 5. Seed Review Cases (20 across the batches)
    // ---------------------------------------------------------------
    const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pastDueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const reviewCaseRows = [
      // Batch 1 - Hunter Health (8 cases: 5 completed, 2 in_progress, 1 past_due)
      { batchId: batchIds[0], providerId: providersByName['Marissa Backhaus'], peerId: reviewersByName['Dr. Angela Martinez'], companyId: companyMap['Hunter Health FQHC'], status: 'completed', aiAnalysisStatus: 'complete', specialtyRequired: 'Family Medicine', dueDate, assignedAt: weekAgo },
      { batchId: batchIds[0], providerId: providersByName['Marissa Backhaus'], peerId: reviewersByName['Dr. Angela Martinez'], companyId: companyMap['Hunter Health FQHC'], status: 'completed', aiAnalysisStatus: 'complete', specialtyRequired: 'Family Medicine', dueDate, assignedAt: weekAgo },
      { batchId: batchIds[0], providerId: providersByName['Robert Chen'], peerId: reviewersByName['Dr. James Patterson'], companyId: companyMap['Hunter Health FQHC'], status: 'completed', aiAnalysisStatus: 'complete', specialtyRequired: 'Internal Medicine', dueDate, assignedAt: weekAgo },
      { batchId: batchIds[0], providerId: providersByName['Robert Chen'], peerId: reviewersByName['Dr. James Patterson'], companyId: companyMap['Hunter Health FQHC'], status: 'completed', aiAnalysisStatus: 'complete', specialtyRequired: 'Internal Medicine', dueDate, assignedAt: weekAgo },
      { batchId: batchIds[0], providerId: providersByName['Marissa Backhaus'], peerId: reviewersByName['Dr. William Chen'], companyId: companyMap['Hunter Health FQHC'], status: 'completed', aiAnalysisStatus: 'complete', specialtyRequired: 'Family Medicine', dueDate, assignedAt: weekAgo },
      { batchId: batchIds[0], providerId: providersByName['Robert Chen'], peerId: reviewersByName['Dr. James Patterson'], companyId: companyMap['Hunter Health FQHC'], status: 'in_progress', aiAnalysisStatus: 'complete', specialtyRequired: 'Internal Medicine', dueDate, assignedAt: weekAgo },
      { batchId: batchIds[0], providerId: providersByName['Marissa Backhaus'], peerId: reviewersByName['Dr. Angela Martinez'], companyId: companyMap['Hunter Health FQHC'], status: 'in_progress', aiAnalysisStatus: 'complete', specialtyRequired: 'Family Medicine', dueDate, assignedAt: weekAgo },
      { batchId: batchIds[0], providerId: providersByName['Robert Chen'], peerId: reviewersByName['Dr. James Patterson'], companyId: companyMap['Hunter Health FQHC'], status: 'past_due', aiAnalysisStatus: 'complete', specialtyRequired: 'Internal Medicine', dueDate: pastDueDate, assignedAt: twoWeeksAgo },

      // Batch 2 - GraceMed (6 cases: 2 assigned, 2 pending_approval, 2 unassigned)
      { batchId: batchIds[1], providerId: providersByName['Sarah Williams'], peerId: reviewersByName['Dr. Priya Sharma'], companyId: companyMap['GraceMed Health Clinic'], status: 'assigned', aiAnalysisStatus: 'complete', specialtyRequired: 'Pediatrics', dueDate, assignedAt: now },
      { batchId: batchIds[1], providerId: providersByName['David Kumar'], peerId: reviewersByName['Dr. Angela Martinez'], companyId: companyMap['GraceMed Health Clinic'], status: 'assigned', aiAnalysisStatus: 'complete', specialtyRequired: 'Family Medicine', dueDate, assignedAt: now },
      { batchId: batchIds[1], providerId: providersByName['Sarah Williams'], peerId: reviewersByName['Dr. Priya Sharma'], companyId: companyMap['GraceMed Health Clinic'], status: 'pending_approval', aiAnalysisStatus: 'complete', specialtyRequired: 'Pediatrics' },
      { batchId: batchIds[1], providerId: providersByName['David Kumar'], peerId: reviewersByName['Dr. William Chen'], companyId: companyMap['GraceMed Health Clinic'], status: 'pending_approval', aiAnalysisStatus: 'complete', specialtyRequired: 'Family Medicine' },
      { batchId: batchIds[1], providerId: providersByName['Sarah Williams'], companyId: companyMap['GraceMed Health Clinic'], status: 'unassigned', aiAnalysisStatus: 'complete', specialtyRequired: 'Pediatrics' },
      { batchId: batchIds[1], providerId: providersByName['David Kumar'], companyId: companyMap['GraceMed Health Clinic'], status: 'unassigned', aiAnalysisStatus: 'pending', specialtyRequired: 'Family Medicine' },

      // Batch 3 - HealthCore (6 cases: all unassigned, mixed AI status)
      { batchId: batchIds[2], providerId: providersByName['Lisa Thompson'], companyId: companyMap['HealthCore Clinic'], status: 'unassigned', aiAnalysisStatus: 'pending', specialtyRequired: 'Internal Medicine' },
      { batchId: batchIds[2], providerId: providersByName['Michael Rivera'], companyId: companyMap['HealthCore Clinic'], status: 'unassigned', aiAnalysisStatus: 'pending', specialtyRequired: 'Pediatrics' },
      { batchId: batchIds[2], providerId: providersByName['Jennifer Okafor'], companyId: companyMap['HealthCore Clinic'], status: 'unassigned', aiAnalysisStatus: 'processing', specialtyRequired: 'Family Medicine' },
      { batchId: batchIds[2], providerId: providersByName['Lisa Thompson'], companyId: companyMap['HealthCore Clinic'], status: 'unassigned', aiAnalysisStatus: 'pending', specialtyRequired: 'Internal Medicine' },
      { batchId: batchIds[2], providerId: providersByName['Jennifer Okafor'], companyId: companyMap['HealthCore Clinic'], status: 'unassigned', aiAnalysisStatus: 'pending', specialtyRequired: 'Family Medicine' },
      { batchId: batchIds[2], providerId: providersByName['Michael Rivera'], companyId: companyMap['HealthCore Clinic'], status: 'unassigned', aiAnalysisStatus: 'pending', specialtyRequired: 'Pediatrics' },
    ];

    const insertedCases = await db.insert(reviewCases).values(reviewCaseRows).returning();

    // ---------------------------------------------------------------
    // 6. Seed AI Analyses (5 realistic analyses for completed/in_progress cases)
    // ---------------------------------------------------------------
    const completedCaseIds = insertedCases
      .filter((c) => c.aiAnalysisStatus === 'complete')
      .slice(0, 5)
      .map((c) => c.id);

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

    const aiAnalysisRows = completedCaseIds.map((caseId, idx) => ({
      caseId,
      chartSummary: `Quarterly follow-up for a patient with Type 2 Diabetes (HbA1c 8.2%, rising) and hypertension (148/92). Provider appropriately intensified therapy with medication adjustments and specialist referrals. Documentation meets most FQHC standards with minor gaps.`,
      criteriaScores: sampleCriteriaScores.map((s) => ({
        ...s,
        score: Math.max(1, s.score + (idx % 2 === 0 ? 0 : -1)),
      })),
      deficiencies: sampleDeficiencies,
      overallScore: 78 + idx * 3,
      documentationScore: 72 + idx * 2,
      clinicalAppropriatenessScore: 85 + idx,
      careCoordinationScore: 90 - idx,
      narrativeDraft: `I reviewed the chart for this quarterly diabetes and hypertension follow-up visit. The provider demonstrated appropriate clinical decision-making by recognizing the rising HbA1c and adjusting the treatment plan accordingly. The addition of glipizide and dose increases for lisinopril and atorvastatin align with current ADA and JNC 8 guidelines.\n\nThe documentation is generally thorough, with a complete physical exam, relevant lab review, and a detailed multi-point care plan. However, there are minor documentation gaps: the social history was not updated, and BMI counseling specifics were not recorded.\n\nPreventive care was well-addressed with a diabetic foot exam, eye referral, and flu vaccine. The follow-up plan is excellent, including both a short-term BP recheck and a comprehensive 3-month visit.\n\nOverall, this encounter meets the standard of care expected for an FQHC. The provider should focus on ensuring social history updates and documenting specific counseling targets for weight management.`,
      modelUsed: 'claude-sonnet-4-5',
      processingTimeMs: 12000 + idx * 1500,
    }));

    if (aiAnalysisRows.length > 0) {
      try {
        for (const row of aiAnalysisRows) {
          await db
            .insert(aiAnalyses)
            .values(row)
            .onConflictDoUpdate({
              target: aiAnalyses.caseId,
              set: {
                chartSummary: row.chartSummary,
                criteriaScores: row.criteriaScores,
                deficiencies: row.deficiencies,
                overallScore: row.overallScore,
                documentationScore: row.documentationScore,
                clinicalAppropriatenessScore: row.clinicalAppropriatenessScore,
                careCoordinationScore: row.careCoordinationScore,
                narrativeDraft: row.narrativeDraft,
                modelUsed: row.modelUsed,
                processingTimeMs: row.processingTimeMs,
              },
            });
        }
      } catch (aiErr: any) {
        console.error('[SEED] AI analyses insert error:', aiErr?.message);
      }
    }

    // ---------------------------------------------------------------
    // 7. Seed Review Results (3 for completed cases)
    // ---------------------------------------------------------------
    const completedCases = insertedCases.filter((c) => c.status === 'completed').slice(0, 3);

    const reviewResultRows = completedCases.map((c, idx) => ({
      caseId: c.id,
      peerId: c.peerId,
      criteriaScores: sampleCriteriaScores,
      deficiencies: idx === 0 ? sampleDeficiencies : [],
      overallScore: 80 + idx * 4,
      narrativeFinal: `I reviewed this clinical encounter chart as part of the FQHC peer review process. The provider demonstrated solid clinical reasoning throughout this diabetes and hypertension follow-up visit. Lab values were appropriately reviewed and medication adjustments were evidence-based.\n\nI agree with the AI's assessment on most criteria. The documentation is adequate but could be strengthened with updated social history and more specific BMI counseling documentation.\n\nThe care coordination and follow-up planning are excellent, with appropriate specialist referrals and a clear return visit schedule. Overall, this represents good quality care consistent with HRSA standards.`,
      aiAgreementPercentage: String(75 + idx * 8),
      peerChanges: idx > 0 ? [
        { criterion: 'Documentation completeness', ai_score: 2, reviewer_score: 3, reason: 'While documentation could be improved, the overall quality meets the standard for a busy FQHC setting.' },
      ] : [],
      qualityScore: 82 + idx * 5,
      qualityNotes: idx === 2
        ? 'Thorough review with meaningful clinical insights. Reviewer appropriately adjusted documentation score with well-reasoned justification.'
        : 'Solid review. Reviewer engaged meaningfully with AI suggestions.',
      submittedAt: new Date(now.getTime() - (3 - idx) * 24 * 60 * 60 * 1000),
      timeSpentMinutes: 14 + idx * 3,
    }));

    if (reviewResultRows.length > 0) {
      try {
        for (const row of reviewResultRows) {
          await db
            .insert(reviewResults)
            .values(row)
            .onConflictDoUpdate({
              target: reviewResults.caseId,
              set: {
                peerId: row.peerId,
                criteriaScores: row.criteriaScores,
                deficiencies: row.deficiencies,
                overallScore: row.overallScore,
                narrativeFinal: row.narrativeFinal,
                aiAgreementPercentage: row.aiAgreementPercentage,
                peerChanges: row.peerChanges,
                qualityScore: row.qualityScore,
                qualityNotes: row.qualityNotes,
                submittedAt: row.submittedAt,
                timeSpentMinutes: row.timeSpentMinutes,
              },
            });
        }
      } catch (resultErr: any) {
        console.error('[SEED] Review results insert error:', resultErr?.message);
      }
    }

    // ---------------------------------------------------------------
    // 8. Update reviewer active_cases_count
    // ---------------------------------------------------------------
    const activeCaseCounts: Record<string, number> = {};
    insertedCases.forEach((c) => {
      if (c.peerId && ['assigned', 'in_progress'].includes(c.status as string)) {
        activeCaseCounts[c.peerId] = (activeCaseCounts[c.peerId] || 0) + 1;
      }
    });

    for (const [peerId, count] of Object.entries(activeCaseCounts)) {
      await db
        .update(peers)
        .set({ activeCasesCount: count })
        .where(eq(peers.id, peerId));
    }

    // ---------------------------------------------------------------
    // 9. Update batch counts
    // ---------------------------------------------------------------
    for (const batch of insertedBatches) {
      const [{ assigned }] = await db
        .select({ assigned: sql<number>`count(*)::int` })
        .from(reviewCases)
        .where(
          and(
            eq(reviewCases.batchId, batch.id),
            inArray(reviewCases.status, ['assigned', 'in_progress', 'completed', 'past_due', 'pending_approval'])
          )
        );

      const [{ completed }] = await db
        .select({ completed: sql<number>`count(*)::int` })
        .from(reviewCases)
        .where(and(eq(reviewCases.batchId, batch.id), eq(reviewCases.status, 'completed')));

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(reviewCases)
        .where(eq(reviewCases.batchId, batch.id));

      await db
        .update(batches)
        .set({
          totalCases: total || 0,
          assignedCases: assigned || 0,
          completedCases: completed || 0,
        })
        .where(eq(batches.id, batch.id));
    }

    await auditLog({
      action: 'demo_data_seeded',
      resourceType: 'system',
      metadata: {
        companies: insertedCompanies.length,
        providers: insertedProviders.length,
        peers: insertedPeers.length,
        batches: insertedBatches.length,
        cases: insertedCases.length,
        ai_analyses: aiAnalysisRows.length,
        review_results: reviewResultRows.length,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      summary: {
        companies: insertedCompanies.length,
        providers: insertedProviders.length,
        peers: insertedPeers.length,
        batches: insertedBatches.length,
        cases: insertedCases.length,
        ai_analyses: aiAnalysisRows.length,
        review_results: reviewResultRows.length,
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
