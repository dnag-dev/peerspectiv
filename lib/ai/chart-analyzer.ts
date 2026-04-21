import { callClaude } from './anthropic';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSignedChartUrl } from '@/lib/storage';
import { extractTextFromPDF } from '@/lib/pdf/extractor';
import { auditLog } from '@/lib/utils/audit';

const CHART_ANALYSIS_SYSTEM_PROMPT = `You are a board-certified physician and medical quality reviewer for Federally Qualified Health Centers (FQHCs). You are reviewing a medical encounter chart for a clinical peer review required by HRSA standards.

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

  "narrative_draft": "A professional 3-5 paragraph peer review narrative written in the style of a board-certified physician. Write this as the reviewer, in first person: 'I reviewed the chart for...'"
}

Scoring guide: 4=Exceeds Standard, 3=Meets Standard, 2=Partially Meets, 1=Does Not Meet, 0=N/A`;

export async function analyzeChart(caseId: string): Promise<void> {
  const startTime = Date.now();

  // Update status to processing
  await supabaseAdmin
    .from('review_cases')
    .update({ ai_analysis_status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', caseId);

  try {
    // Fetch case info
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('review_cases')
      .select('*, provider:providers(first_name, last_name, specialty), company:companies(name)')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) throw new Error('Case not found');

    let chartText: string;
    let pageCount = 0;
    let extractionMethod: 'pdf-parse' | 'claude-native' | 'failed' | 'sample' = 'sample';

    if (caseData.chart_file_path) {
      // Download and extract PDF (pdf-parse first, falls back to claude-native vision)
      const signedUrl = await getSignedChartUrl(caseData.chart_file_path);
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

    const specialty = (caseData.provider as any)?.specialty || caseData.specialty_required || 'Family Medicine';

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
    await supabaseAdmin.from('ai_analyses').upsert({
      case_id: caseId,
      chart_summary: analysis.chart_summary,
      criteria_scores: analysis.criteria_scores,
      deficiencies: analysis.deficiencies,
      overall_score: analysis.overall_score,
      documentation_score: analysis.documentation_score,
      clinical_appropriateness_score: analysis.clinical_appropriateness_score,
      care_coordination_score: analysis.care_coordination_score,
      narrative_draft: analysis.narrative_draft,
      tokens_used: null,
      model_used: 'claude-sonnet-4-5',
      processing_time_ms: processingTime,
      chart_text_extracted: chartText.slice(0, 50000),
      extraction_method: extractionMethod,
    }, { onConflict: 'case_id' });

    // Update case status
    await supabaseAdmin
      .from('review_cases')
      .update({
        ai_analysis_status: 'complete',
        ai_processed_at: new Date().toISOString(),
        chart_pages: pageCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId);

    await auditLog({
      action: 'ai_analysis_complete',
      resourceType: 'review_case',
      resourceId: caseId,
      metadata: { processing_time_ms: processingTime },
    });
  } catch (err) {
    console.log('[ERROR] AI analysis failed for case:', caseId);
    await supabaseAdmin
      .from('review_cases')
      .update({ ai_analysis_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', caseId);
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
