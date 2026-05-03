import { describe, it, expect } from 'vitest';
import { scoreReview } from './default-based';

describe('default-based scoring (SA-127C examples)', () => {
  it('SA-127C-1: 89 Yes / 1 No / 0 NA → 98.89%', () => {
    const fields = Array.from({ length: 90 }, (_, i) => ({
      field_key: `q${i + 1}`,
      field_label: `Q${i + 1}`,
      field_type: 'yes_no_na' as const,
      default_answer: 'yes',
    }));
    const responses: Record<string, string> = {};
    for (let i = 0; i < 89; i++) responses[`q${i + 1}`] = 'yes';
    responses['q90'] = 'no';
    const result = scoreReview({ scoring_system: 'yes_no_na', form_fields: fields }, responses);
    expect(result.numerator).toBe(89);
    expect(result.denominator).toBe(90);
    expect(result.total_measures_met_pct).toBe(98.89);
  });

  it('SA-127C-2: 50 Yes / 40 No / 0 NA → 55.56%', () => {
    const fields = Array.from({ length: 90 }, (_, i) => ({
      field_key: `q${i + 1}`,
      field_label: `Q${i + 1}`,
      field_type: 'yes_no_na' as const,
      default_answer: 'yes',
    }));
    const responses: Record<string, string> = {};
    for (let i = 0; i < 50; i++) responses[`q${i + 1}`] = 'yes';
    for (let i = 50; i < 90; i++) responses[`q${i + 1}`] = 'no';
    const result = scoreReview({ scoring_system: 'yes_no_na', form_fields: fields }, responses);
    expect(result.numerator).toBe(50);
    expect(result.denominator).toBe(90);
    expect(result.total_measures_met_pct).toBe(55.56);
  });

  it('SA-127C-3: 10 Yes / 4 No / 76 NA → 71.43%', () => {
    const fields = Array.from({ length: 90 }, (_, i) => ({
      field_key: `q${i + 1}`,
      field_label: `Q${i + 1}`,
      field_type: 'yes_no_na' as const,
      default_answer: 'yes',
    }));
    const responses: Record<string, string> = {};
    for (let i = 0; i < 10; i++) responses[`q${i + 1}`] = 'yes';
    for (let i = 10; i < 14; i++) responses[`q${i + 1}`] = 'no';
    for (let i = 14; i < 90; i++) responses[`q${i + 1}`] = 'na';
    const result = scoreReview({ scoring_system: 'yes_no_na', form_fields: fields }, responses);
    expect(result.numerator).toBe(10);
    expect(result.denominator).toBe(14);
    expect(result.total_measures_met_pct).toBe(71.43);
  });

  it('SA-127B: 12 questions, 10 Yes / 1 No / 1 NA → 90.91%', () => {
    const fields = Array.from({ length: 12 }, (_, i) => ({
      field_key: `q${i + 1}`,
      field_label: `Q${i + 1}`,
      field_type: 'yes_no_na' as const,
      default_answer: 'yes',
    }));
    const responses: Record<string, string> = {};
    for (let i = 0; i < 10; i++) responses[`q${i + 1}`] = 'yes';
    responses['q11'] = 'no';
    responses['q12'] = 'na';
    const result = scoreReview({ scoring_system: 'yes_no_na', form_fields: fields }, responses);
    expect(result.total_measures_met_pct).toBe(90.91);
  });

  it('A/B/C/NA: default=A, [A,A,B,C,NA] → 50.00%', () => {
    const fields = ['q1', 'q2', 'q3', 'q4', 'q5'].map((k) => ({
      field_key: k,
      field_label: k,
      field_type: 'abc_na' as const,
      default_answer: 'A',
    }));
    const responses = { q1: 'A', q2: 'A', q3: 'B', q4: 'C', q5: 'NA' };
    const result = scoreReview({ scoring_system: 'abc_na', form_fields: fields }, responses);
    expect(result.numerator).toBe(2);
    expect(result.denominator).toBe(4);
    expect(result.total_measures_met_pct).toBe(50.0);
  });
});
