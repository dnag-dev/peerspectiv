import Anthropic from '@anthropic-ai/sdk';
import { PDFParse } from 'pdf-parse';

const MAX_CHARS = 80000;
const TEXT_LAYER_THRESHOLD = 200; // < 200 chars => probably scanned

export type ExtractionMethod = 'pdf-parse' | 'claude-native' | 'failed';

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
 * Two-attempt PDF extraction:
 *   1. pdf-parse  — instant, free. Wins for native text PDFs.
 *   2. claude-native — fallback for scanned/image PDFs. Sends raw PDF
 *      bytes as base64 to claude-sonnet-4-5 via the document content block.
 *
 * The result includes `method` so the caller can persist which path was used
 * (saved to ai_analyses.extraction_method).
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ExtractedPDF> {
  // ── ATTEMPT 1: pdf-parse ────────────────────────────────────────────────
  let pageCount = 0;
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const rawText = data.text || '';
    // pdf-parse v2 inserts synthetic "-- N of M --" page markers; strip them
    const cleanText = rawText.replace(/-- \d+ of \d+ --/g, '').trim();
    pageCount = Array.isArray(data.pages) ? data.pages.length : (data.total ?? 0);

    if (cleanText.length > TEXT_LAYER_THRESHOLD) {
      const truncated = cleanText.length > MAX_CHARS;
      return {
        text: truncated
          ? cleanText.slice(0, MAX_CHARS) + '\n[... document truncated for analysis ...]'
          : cleanText,
        pageCount,
        truncated,
        method: 'pdf-parse',
        isScanned: false,
      };
    }
  } catch (err) {
    // pdf-parse failed entirely — fall through to claude-native
    console.warn('[pdf] pdf-parse failed, will try claude-native:', (err as Error).message);
  }

  // ── ATTEMPT 2: claude-native PDF extraction ────────────────────────────
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
      pageCount,
      truncated,
      method: 'claude-native',
      isScanned: true,
    };
  } catch (err) {
    console.error('[pdf] claude-native extraction failed:', (err as Error).message);
    return {
      text: '',
      pageCount,
      truncated: false,
      method: 'failed',
      isScanned: true,
    };
  }
}
