import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/ai/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload/extract-metadata
 *
 * Accepts a PDF file upload, extracts text from the first page using pdf-parse,
 * then uses Claude to identify provider name, encounter date, and specialty.
 *
 * Used by the batch wizard when filename parsing can't determine the provider.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const filename = (formData.get('filename') as string) || file?.name || '';

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // Read PDF bytes
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text using pdf-parse
    let text = '';
    try {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
      const data = await pdfParse(buffer, { max: 2 }); // first 2 pages max
      text = data.text || '';
    } catch (err: any) {
      console.error('[extract-metadata] pdf-parse error:', err?.message);
      return NextResponse.json(
        { error: 'Failed to parse PDF', detail: err?.message },
        { status: 422 }
      );
    }

    if (text.trim().length < 20) {
      // Likely a scanned/image PDF — no extractable text
      return NextResponse.json({
        provider_name: null,
        encounter_date: null,
        specialty: null,
        _note: 'No extractable text found — may be a scanned document',
      });
    }

    // Truncate to ~3000 chars (first page is usually enough)
    const truncated = text.slice(0, 3000);

    const system = `You extract metadata from medical chart documents. Return ONLY valid JSON — no prose, no markdown fences.`;

    const user = `Extract the following from this medical chart document${filename ? ` (filename: "${filename}")` : ''}:

1. **provider_name**: The clinician who authored/signed the note (look for "Electronically signed by", "Authored by", the name after assessment/plan sections, or the provider listed at the top). Return ONLY the name — no credentials (remove MD, CNP, PA, DO, NP, RN, LPN, APRN, etc.). If multiple providers appear, use the one who signed/authored the note.
2. **encounter_date**: The date of service or visit date in ISO format (YYYY-MM-DD). Look for "Visit Date:", "Date of Service:", "DOS:", "Date:", "Encounter Date:" fields. If the year is 2-digit (e.g., "11/29/25"), assume 2000s (2025).
3. **specialty**: The medical specialty if identifiable. Map to one of: Family Medicine, Internal Medicine, Pediatrics, OB/GYN, Behavioral Health, Dental, Cardiology, HIV, Mental Health, Primary Care, Gynecology, Obstetrics, Dermatology, Neurology, Orthopedics, Podiatry, Chiropractic, Acupuncture, Emergency Medicine, Urgent Care. Return null if unclear.

Return JSON: {"provider_name": "string or null", "encounter_date": "YYYY-MM-DD or null", "specialty": "string or null"}

Document text:
${truncated}`;

    let parsed: { provider_name: string | null; encounter_date: string | null; specialty: string | null };
    try {
      const raw = await callClaude(system, user, 256);
      let cleaned = raw.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);
      parsed = JSON.parse(cleaned);
    } catch (err: any) {
      console.error('[extract-metadata] AI parse error:', err?.message);
      return NextResponse.json({
        provider_name: null,
        encounter_date: null,
        specialty: null,
        _note: 'AI extraction failed',
      });
    }

    return NextResponse.json({
      provider_name: parsed.provider_name || null,
      encounter_date: parsed.encounter_date || null,
      specialty: parsed.specialty || null,
    });
  } catch (err: any) {
    console.error('[extract-metadata]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to extract metadata' },
      { status: 500 }
    );
  }
}
