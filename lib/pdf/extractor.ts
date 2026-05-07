import Anthropic from '@anthropic-ai/sdk';
import { callClaude } from '@/lib/ai/anthropic';

const MAX_CHARS = 80000;
const TEXT_LAYER_THRESHOLD = 200; // < 200 chars => probably scanned

export type ExtractionMethod = 'claude-native' | 'failed';

export interface ExtractedPDF {
  text: string;
  pageCount: number;
  truncated: boolean;
  method: ExtractionMethod;
  isScanned: boolean;
}

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

/**
 * PDF text extraction using Claude's native PDF document support.
 * Sends raw PDF bytes as base64 to Claude via the document content block.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ExtractedPDF> {
  // Heuristic page count from the raw PDF dictionary — Claude's vision
  // extraction doesn't return one, but downstream consumers expect a
  // numeric estimate for paging hints. Counts /Type /Page occurrences.
  const headerStr = buffer.toString('latin1', 0, Math.min(buffer.length, 200_000));
  const pageMatches = headerStr.match(/\/Type\s*\/Page\b(?!s)/g);
  const pageCount = Math.max(1, pageMatches ? pageMatches.length : 1);

  // ── Claude-native PDF extraction ────────────────────────────────────
  try {
    const client = getAnthropic();
    const base64 = buffer.toString('base64');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract all text from this medical document exactly as written. Preserve structure — sections, vitals, tables, medications. Return raw text only.',
            },
          ],
        },
      ],
    });

    const block = response.content.find((b) => b.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;
    const visionText = (block?.text ?? '').trim();
    const truncated = visionText.length > MAX_CHARS;

    return {
      text: truncated ? visionText.slice(0, MAX_CHARS) : visionText,
      pageCount: 0,
      truncated,
      method: 'claude-native',
      isScanned: true,
    };
  } catch (err) {
    console.error('[pdf] claude-native extraction failed:', (err as Error).message);
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      method: 'failed',
      isScanned: true,
    };
  }
}

// ─── Chart metadata extraction (D1) ──────────────────────────────────────────

export interface ChartMetadataGuess {
  provider_first: string | null;
  provider_last: string | null;
  specialty_guess: string | null;
  encounter_date: string | null; // YYYY-MM-DD
  patient_first: string | null;
  patient_last: string | null;
  mrn: string | null;
  is_pediatric: boolean;
}

const EMPTY_METADATA: ChartMetadataGuess = {
  provider_first: null,
  provider_last: null,
  specialty_guess: null,
  encounter_date: null,
  patient_first: null,
  patient_last: null,
  mrn: null,
  is_pediatric: false,
};

const METADATA_SYSTEM_PROMPT = `You extract structured metadata from the first few pages of a medical encounter chart.
Return ONLY valid JSON (no prose) matching this exact schema:
{
  "provider_first": string|null,
  "provider_last": string|null,
  "specialty_guess": string|null,
  "encounter_date": "YYYY-MM-DD"|null,
  "patient_first": string|null,
  "patient_last": string|null,
  "mrn": string|null,
  "is_pediatric": boolean
}
specialty_guess must be one of: "Family Medicine", "Internal Medicine", "Pediatrics", "OB/GYN", "Behavioral Health", "Dental", "Cardiology", "HIV", "Mental Health", "Primary Care", "Urgent Care", or null.
is_pediatric is true only when the patient is clearly under 18 (DOB or stated age). If unclear, false.
Use null for any field you cannot confidently extract. Do not guess.`;

/** Extract patient/provider/encounter metadata from the first ~3 pages of chart text. */
export async function extractChartMetadata(buffer: Buffer): Promise<ChartMetadataGuess> {
  // Extract text via Claude native PDF support
  let firstPagesText = '';
  try {
    const extracted = await extractTextFromPDF(buffer);
    firstPagesText = extracted.text.slice(0, 12000).trim();
  } catch (err) {
    console.warn('[pdf] metadata extraction failed:', (err as Error).message);
    return EMPTY_METADATA;
  }

  if (!firstPagesText || firstPagesText.length < 50) {
    return EMPTY_METADATA;
  }

  try {
    const userPrompt = `CHART TEXT (first ~3 pages):\n---\n${firstPagesText.slice(0, 12000)}\n---`;
    const raw = await callClaude(METADATA_SYSTEM_PROMPT, userPrompt, 1024);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return EMPTY_METADATA;
    const parsed = JSON.parse(match[0]);
    return {
      provider_first: parsed.provider_first ?? null,
      provider_last: parsed.provider_last ?? null,
      specialty_guess: parsed.specialty_guess ?? null,
      encounter_date: parsed.encounter_date ?? null,
      patient_first: parsed.patient_first ?? null,
      patient_last: parsed.patient_last ?? null,
      mrn: parsed.mrn ?? null,
      is_pediatric: !!parsed.is_pediatric,
    };
  } catch (err) {
    console.warn('[pdf] metadata Claude call failed:', (err as Error).message);
    return EMPTY_METADATA;
  }
}
