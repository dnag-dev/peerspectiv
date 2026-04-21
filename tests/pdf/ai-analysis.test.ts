import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { pdfInventory, getSpecialtyForFile } from './pdf-inventory';
import { extractPDF } from './extract-helper';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CHUNK_LIMIT = 80000;

async function analyzeChart(pdfPath: string) {
  const specialty = getSpecialtyForFile(pdfPath);
  const result = await extractPDF(pdfPath);

  // Skip AI analysis for scanned PDFs — they have no text to analyze
  if (result.isScanned) {
    return { skipped: true, reason: 'scanned/no extractable text', specialty };
  }

  const chartText = result.text.slice(0, CHUNK_LIMIT);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `You are a medical chart analysis AI for a peer review company.
Analyze this medical record and pre-fill a peer review form.
Return ONLY valid JSON with no preamble or markdown:
{
  "chart_summary": "string (3-5 sentences plain English summary)",
  "risk_flags": [{ "type": "clinical|documentation|safety", "description": "string", "severity": "high|medium|low" }],
  "suggested_score": 0_to_100,
  "pre_filled_responses": {
    "documentation_complete": { "value": true_or_false, "confidence": "high|medium|low", "reasoning": "string", "page_reference": "string|null" },
    "diagnosis_appropriate": { "value": true_or_false, "confidence": "high|medium|low", "reasoning": "string", "page_reference": "string|null" },
    "treatment_plan_documented": { "value": true_or_false, "confidence": "high|medium|low", "reasoning": "string", "page_reference": "string|null" },
    "medication_reconciliation": { "value": true_or_false, "confidence": "high|medium|low", "reasoning": "string", "page_reference": "string|null" },
    "followup_plan": { "value": true_or_false, "confidence": "high|medium|low", "reasoning": "string", "page_reference": "string|null" },
    "chronic_disease_management": { "value": true_or_false, "confidence": "high|medium|low", "reasoning": "string", "page_reference": "string|null" },
    "social_determinants": { "value": true_or_false, "confidence": "high|medium|low", "reasoning": "string", "page_reference": "string|null" },
    "overall_quality_rating": { "value": 0_to_100, "confidence": "high|medium|low", "reasoning": "string", "page_reference": null }
  }
}

Specialty: ${specialty}
Chart text: ${chartText}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
  const raw = block?.text ?? '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

describe('AI Chart Analysis — Real PDFs', () => {
  // Limit to first 5 charts to keep token cost reasonable in CI
  // (full 37-file run is in generate-report.ts)
  const samples = pdfInventory.medicalCharts.slice(0, 5);

  for (const pdfPath of samples) {
    const filename = path.basename(pdfPath);

    it(`analyzes: ${filename}`, async () => {
      const result = await analyzeChart(pdfPath);

      if (result.skipped) {
        console.log(`\n📄 ${filename} — SKIPPED (${result.reason})`);
        return; // Pass — scanned PDFs are documented elsewhere
      }

      console.log(`\n📄 ${filename}`);
      console.log(`   Summary: ${result.chart_summary?.slice(0, 120)}...`);
      console.log(`   Score:   ${result.suggested_score}`);
      console.log(`   Flags:   ${result.risk_flags?.length || 0}`);
      console.log(`   Fields:  ${Object.keys(result.pre_filled_responses || {}).length} pre-filled`);

      expect(result.chart_summary).toBeDefined();
      expect(result.chart_summary.length).toBeGreaterThan(20);
      expect(typeof result.suggested_score).toBe('number');
      expect(result.suggested_score).toBeGreaterThanOrEqual(0);
      expect(result.suggested_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.risk_flags)).toBe(true);
      expect(result.pre_filled_responses).toBeDefined();
    }, 90000);

    it(`${filename} — required form fields present (skips scanned)`, async () => {
      const result = await analyzeChart(pdfPath);
      if (result.skipped) return;
      const required = [
        'documentation_complete',
        'diagnosis_appropriate',
        'treatment_plan_documented',
        'medication_reconciliation',
        'followup_plan',
        'overall_quality_rating',
      ];
      for (const field of required) {
        expect(result.pre_filled_responses).toHaveProperty(field);
        expect(result.pre_filled_responses[field]).toHaveProperty('value');
        expect(result.pre_filled_responses[field]).toHaveProperty('confidence');
        expect(result.pre_filled_responses[field]).toHaveProperty('reasoning');
      }
    }, 90000);

    it(`${filename} — confidence values valid (skips scanned)`, async () => {
      const result = await analyzeChart(pdfPath);
      if (result.skipped) return;
      const valid = ['high', 'medium', 'low'];
      for (const f of Object.values(result.pre_filled_responses ?? {})) {
        expect(valid).toContain((f as any).confidence);
      }
    }, 90000);
  }
});
