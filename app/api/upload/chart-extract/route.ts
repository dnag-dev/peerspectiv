import { NextRequest, NextResponse } from 'next/server';
import { extractChartMetadata } from '@/lib/pdf/extractor';

/**
 * D1: Wizard-side chart metadata extraction.
 * Accepts a blob URL (PDF already uploaded to Vercel Blob), downloads it,
 * runs the metadata extractor, and returns the structured guess.
 *
 * The wizard uses this to pre-fill provider/specialty/encounter date pickers
 * before the case is created. It does NOT persist anything — that happens in
 * /api/upload/chart once the case row exists.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { blob_url, blob_name } = body as { blob_url?: string; blob_name?: string };

    if (!blob_url || typeof blob_url !== 'string') {
      return NextResponse.json(
        { error: 'blob_url is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    try {
      const res = await fetch(blob_url);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : 'Failed to download blob',
          code: 'BLOB_FETCH_FAILED',
        },
        { status: 502 }
      );
    }

    const metadata = await extractChartMetadata(buffer);
    return NextResponse.json({ ...metadata, blob_name: blob_name ?? null });
  } catch (err) {
    console.error('[API] POST /api/upload/chart-extract error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
