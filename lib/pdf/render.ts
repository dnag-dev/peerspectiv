import { renderToBuffer } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

/**
 * Render a React-PDF document tree to a PDF buffer.
 * Used by all server-side report routes.
 */
export async function renderPdfToBuffer(doc: ReactElement): Promise<Buffer> {
  const buffer = await renderToBuffer(doc);
  return buffer as unknown as Buffer;
}

export function pdfResponseHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };
}
