// TODO Section F8: when company.tier !== 'white_glove', gate prefill behind a per-form
// allow_ai_prefill flag. See docs/product-roadmap.md.

import { callClaude } from './anthropic';
import { db } from '@/lib/db';
import { reviewCases, aiAnalyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSignedChartUrl } from '@/lib/storage';
import { extractTextFromPDF } from '@/lib/pdf/extractor';
import { auditLog } from '@/lib/utils/audit';

const CHART_ANALYSIS_SYSTEM_PROMPT = `You are a board-certified physician and medical quality peer for Federally Qualified Health Centers (FQHCs). You are reviewing a medical encounter chart for a clinical peer review required by HRSA standards.

Your task is to analyze the provided medical chart text and produce a complete, structured peer review according to the FQHC standard review template.

Analyze this chart and return ONLY valid JSON in exactly this structure. Do not include any text outside the JSON:

{
  "chart_summary": "2-3 sentence plain English summary of the encounter. Include chief complaint, diagnosis, and treatment plan. No specific patient identifiers.",

  "criteria_scores": [
    {
      "criterion": "Appropriateness of diagnosis",
      "score": 0,
      "score_label": "Meets Standard|Exceeds|Does Not Meet|Partially Meets|N/A",
      "rationale": "1-2 sentences citing specific chart evidence",
      "ai_flag": false,
      "flag_reason": null
    },
    {
      "criterion": "Appropriateness of treatment plan",
      "score": 0,
      "score_label": "",
      "rationale": "",
      "ai_flag": false,
      "flag_reason": null
    },
    {
      "criterion": "Medication appropriateness and safety",
      "score": 0,
      "score_label": "",
      "rationale": "",
      "ai_flag": false,
      "flag_reason": null
    },
    {
      "criterion": "Documentation completeness",
      "score": 0,
      "score_label": "",
      "rationale": "",
      "ai_flag": false,
      "flag_reason": null
    },
    {
      "criterion": "Preventive care and screenings",
      "score": 0,
      "score_label": "",
      "rationale": "",
      "ai_flag": false,
      "flag_reason": null
    },
    {
      "criterion": "Follow-up planning and care coordination",
      "score": 0,
      "score_label": "",
      "rationale": "",
      "ai_flag": false,
      "flag_reason": null
    },
    {
      "criterion": "Patient education documented",
      "score": 0,
      "score_label": "",
      "rationale": "",
      "ai_flag": false,
      "flag_reason": null
    },
    {
      "criterion": "Adherence to clinical guidelines",
      "score": 0,
      "score_label": "",
      "rationale": "",
      "ai_flag": false,
      "flag_reason": null
    }
  ],

  "deficiencies": [
    {
      "type": "Documentation|Clinical|Medication|Process",
      "severity": "Minor|Moderate|Major",
      "description": "Clear description of the deficiency",
      "chart_citation": "Specific reference to where in the chart this was identified",
      "recommendation": "What should have been done differently"
    }
  ],

  "overall_score": 0,
  "documentation_score": 0,
  "clinical_appropriateness_score": 0,
  "care_coordination_score": 0,

  "narrative_draft": "A professional 3-5 paragraph peer review narrative written in the style of a board-certified physician. Write this as the peer, in first person: 'I reviewed the chart for...'",

  "mrn": "Medical record number found in the chart, or null if not present. Look for headings like 'MRN', 'Medical Record Number', 'MR#', or chart-specific identifiers near the top of the document.",
  "mrn_confidence": "high|medium|low — high if MRN is explicitly labeled, medium if inferred from a numeric identifier near patient demographics, low otherwise."
}

Scoring guide: 4=Exceeds Standard, 3=Meets Standard, 2=Partially Meets, 1=Does Not Meet, 0=N/A`;

export async function analyzeChart(caseId: string): Promise<void> {
  const startTime = Date.now();

  // Update status to processing
  await db
    .update(reviewCases)
    .set({ aiAnalysisStatus: 'processing', updatedAt: new Date() })
    .where(eq(reviewCases.id, caseId));

  try {
    // Fetch case info
    const caseData = await db.query.reviewCases.findFirst({
      where: eq(reviewCases.id, caseId),
      with: {
        provider: { columns: { firstName: true, lastName: true, specialty: true } },
        company: { columns: { name: true } },
      },
    });

    if (!caseData) throw new Error('Case not found');

    let chartText: string;
    let pageCount = 0;
    let extractionMethod: 'claude-native' | 'failed' | 'sample' = 'sample';

    if (caseData.chartFilePath) {
      // Download and extract PDF
      const signedUrl = await getSignedChartUrl(caseData.chartFilePath);
      const response = await fetch(signedUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const extracted = await extractTextFromPDF(buffer);
      chartText = extracted.text;
      pageCount = extracted.pageCount;
      extractionMethod = extracted.method;
    } else {
      // Demo mode: use sample chart text
      chartText = SAMPLE_CHART_TEXT;
      pageCount = 4;
    }

    const specialty = caseData.provider?.specialty || caseData.specialtyRequired || 'Family Medicine';

    const userPrompt = `Provider specialty being reviewed: ${specialty}
Review type: Clinical Quality Peer Review
FQHC Standards: HRSA/UDS Quality Measures

CHART TEXT:
---
${chartText}
---`;

    const aiResponse = await callClaude(CHART_ANALYSIS_SYSTEM_PROMPT, userPrompt, 8192);
    const processingTime = Date.now() - startTime;

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    const analysis = JSON.parse(jsonMatch[0]);

    // Store analysis
    await db
      .insert(aiAnalyses)
      .values({
        caseId,
        chartSummary: analysis.chart_summary,
        criteriaScores: analysis.criteria_scores,
        deficiencies: analysis.deficiencies,
        overallScore: analysis.overall_score,
        documentationScore: analysis.documentation_score,
        clinicalAppropriatenessScore: analysis.clinical_appropriateness_score,
        careCoordinationScore: analysis.care_coordination_score,
        narrativeDraft: analysis.narrative_draft,
        tokensUsed: null,
        modelUsed: 'claude-sonnet-4-5',
        processingTimeMs: processingTime,
        chartTextExtracted: chartText.slice(0, 50000),
        extractionMethod,
      })
      .onConflictDoUpdate({
        target: aiAnalyses.caseId,
        set: {
          chartSummary: analysis.chart_summary,
          criteriaScores: analysis.criteria_scores,
          deficiencies: analysis.deficiencies,
          overallScore: analysis.overall_score,
          documentationScore: analysis.documentation_score,
          clinicalAppropriatenessScore: analysis.clinical_appropriateness_score,
          careCoordinationScore: analysis.care_coordination_score,
          narrativeDraft: analysis.narrative_draft,
          tokensUsed: null,
          modelUsed: 'claude-sonnet-4-5',
          processingTimeMs: processingTime,
          chartTextExtracted: chartText.slice(0, 50000),
          extractionMethod,
        },
      });

    // Phase 2 — persist AI-extracted MRN onto the case (PR-035/036). Only
    // overwrite when the case has no MRN yet, so a peer-corrected value is
    // never clobbered by a re-run.
    const aiMrn =
      typeof analysis.mrn === 'string' && analysis.mrn.trim() ? analysis.mrn.trim() : null;
    let mrnPatch: { mrnNumber?: string; mrnSource?: string } = {};
    if (aiMrn) {
      const [existing] = await db
        .select({ mrnNumber: reviewCases.mrnNumber })
        .from(reviewCases)
        .where(eq(reviewCases.id, caseId))
        .limit(1);
      if (!existing?.mrnNumber) {
        mrnPatch = { mrnNumber: aiMrn, mrnSource: 'ai_extracted' };
      }
    }

    // Update case status
    await db
      .update(reviewCases)
      .set({
        aiAnalysisStatus: 'complete',
        aiProcessedAt: new Date(),
        chartPages: pageCount,
        updatedAt: new Date(),
        ...mrnPatch,
      })
      .where(eq(reviewCases.id, caseId));

    await auditLog({
      action: 'ai_analysis_complete',
      resourceType: 'review_case',
      resourceId: caseId,
      metadata: { processing_time_ms: processingTime },
    });
  } catch (err) {
    console.log('[ERROR] AI analysis failed for case:', caseId);
    await db
      .update(reviewCases)
      .set({ aiAnalysisStatus: 'failed', updatedAt: new Date() })
      .where(eq(reviewCases.id, caseId));
  }
}

const SAMPLE_CHART_TEXT = `
ENCOUNTER NOTE
Date of Service: 03/15/2025
Provider: Dr. Marissa Backhaus, MD - Family Medicine
Clinic: Hunter Health FQHC

CHIEF COMPLAINT: Patient presents for follow-up of Type 2 Diabetes Mellitus and hypertension management.

HISTORY OF PRESENT ILLNESS:
45-year-old female patient with a 5-year history of Type 2 Diabetes and 3-year history of hypertension returns for quarterly follow-up. Patient reports general compliance with medications but admits to occasional missed doses of metformin. Reports increased thirst and urination over the past 2 weeks. Denies chest pain, shortness of breath, visual changes, or numbness/tingling in extremities. Diet has been inconsistent - patient reports difficulty maintaining low-carb diet due to financial constraints. Currently employed part-time, has Medicaid coverage.

MEDICATIONS:
1. Metformin 1000mg BID
2. Lisinopril 20mg daily
3. Atorvastatin 20mg daily at bedtime

ALLERGIES: NKDA

VITAL SIGNS:
BP: 148/92 mmHg (elevated)
HR: 78 bpm
Temp: 98.4F
Weight: 198 lbs (BMI 33.2)
Height: 5'5"
SpO2: 98% on room air

PHYSICAL EXAM:
General: Alert, oriented, no acute distress
HEENT: PERRLA, oropharynx clear, no thyromegaly
Cardiovascular: Regular rate and rhythm, no murmurs
Respiratory: Clear to auscultation bilaterally
Abdomen: Soft, non-tender, no organomegaly
Extremities: No edema, dorsalis pedis pulses 2+ bilaterally, monofilament testing normal
Skin: No lesions, no acanthosis nigricans

LABORATORY RESULTS (drawn 1 week prior):
HbA1c: 8.2% (previously 7.4% three months ago)
Fasting glucose: 168 mg/dL
Total cholesterol: 210 mg/dL
LDL: 128 mg/dL
HDL: 42 mg/dL
Triglycerides: 198 mg/dL
Creatinine: 0.9 mg/dL
eGFR: >90 mL/min
Urine microalbumin: negative

ASSESSMENT:
1. Type 2 Diabetes Mellitus - suboptimally controlled, HbA1c rising
2. Hypertension - not at goal (target <140/90 per JNC 8 for diabetic patients)
3. Hyperlipidemia - LDL not at goal for diabetic patient
4. Obesity - BMI 33.2

PLAN:
1. Diabetes: Increase metformin to 1000mg BID (already at max). Add glipizide 5mg daily before breakfast. Recheck HbA1c in 3 months. Referral to diabetes educator.
2. Hypertension: Increase lisinopril to 40mg daily. Recheck BP in 2 weeks. Discussed DASH diet.
3. Hyperlipidemia: Increase atorvastatin to 40mg daily. Target LDL <100.
4. Obesity: Discussed weight management strategies. Referred to community nutrition program.
5. Preventive care: Diabetic foot exam performed today - normal. Diabetic eye exam - due, referral placed. Flu vaccine - given today. Colonoscopy screening discussed - patient declines at this time.
6. Follow-up: Return in 2 weeks for BP recheck, 3 months for comprehensive follow-up.

Patient education provided on medication compliance, signs/symptoms of hypoglycemia with new medication, dietary modifications, and importance of regular exercise. Patient verbalized understanding and agreement with plan.

Electronically signed by: Dr. Marissa Backhaus, MD
Date: 03/15/2025 14:32 EST
`;
