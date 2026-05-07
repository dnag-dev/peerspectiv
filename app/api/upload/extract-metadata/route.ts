import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

/**
 * POST /api/upload/extract-metadata
 *
 * Accepts a PDF file, sends it to Claude's native PDF support to extract
 * provider name, encounter date, and specialty.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const filename = (formData.get('filename') as string) || file?.name || '';

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: `Extract the following from this medical chart document${filename ? ` (filename: "${filename}")` : ''}:

1. **provider_name**: The clinician who authored/signed the note. Return ONLY the name — no credentials (remove MD, CNP, PA, DO, NP, RN, LPN, APRN, etc.).
2. **encounter_date**: The date of service or visit date in ISO format (YYYY-MM-DD). If the year is 2-digit (e.g., "11/29/25"), assume 2000s (2025).
3. **specialty**: The medical specialty. Map to one of: Family Medicine, Internal Medicine, Pediatrics, OB/GYN, Behavioral Health, Dental, Cardiology, HIV, Mental Health, Primary Care, Gynecology, Obstetrics, Urgent Care. Return null if unclear.

Return ONLY JSON: {"provider_name": "string or null", "encounter_date": "YYYY-MM-DD or null", "specialty": "string or null"}`,
            },
          ],
        },
      ],
    });

    const block = response.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    if (!block) {
      return NextResponse.json({ provider_name: null, encounter_date: null, specialty: null });
    }

    let parsed: { provider_name: string | null; encounter_date: string | null; specialty: string | null };
    try {
      let cleaned = block.text.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ provider_name: null, encounter_date: null, specialty: null });
    }

    return NextResponse.json({
      provider_name: parsed.provider_name || null,
      encounter_date: parsed.encounter_date || null,
      specialty: parsed.specialty || null,
    });
  } catch (err: any) {
    console.error('[extract-metadata]', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
