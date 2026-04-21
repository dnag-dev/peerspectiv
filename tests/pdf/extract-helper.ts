import fs from 'fs';
import { extractTextFromPDF } from '../../lib/pdf/extractor';

/**
 * Test wrapper around the production extractor.
 * Returns the same shape the old helper exposed plus the extraction method
 * so report tests can show pdf-parse vs claude-native vs failed.
 */
export async function extractPDF(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const result = await extractTextFromPDF(buffer);
  const text = result.text;
  return {
    text,
    rawText: text,
    pages: result.pageCount,
    chars: text.length,
    words: text.split(/\s+/).filter(Boolean).length,
    method: result.method,
    isScanned: result.isScanned,
  };
}
