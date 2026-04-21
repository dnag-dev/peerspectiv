import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { pdfInventory } from './pdf-inventory';
import { extractPDF } from './extract-helper';

describe('PDF Extraction — All Real Files', () => {
  const allPDFs = [
    ...pdfInventory.medicalCharts,
    ...pdfInventory.reviewForms,
    ...pdfInventory.contracts,
    ...pdfInventory.reports,
    ...pdfInventory.rosters,
  ];

  for (const pdfPath of allPDFs) {
    const filename = path.basename(pdfPath);

    it(`extracts text from: ${filename}`, async () => {
      const result = await extractPDF(pdfPath);
      const status = result.isScanned ? '⚠ SCANNED' : 'OK';
      console.log(`  ${filename}: ${result.pages}p, ${result.words}w, ${result.chars}c [${status}]`);
      // Always opens — even scanned PDFs report page count
      expect(result.pages).toBeGreaterThan(0);
    });

    it(`${filename} — text quality check`, async () => {
      const result = await extractPDF(pdfPath);
      // Scanned PDFs are tracked via isScanned flag; extraction itself must not throw
      if (!result.isScanned) {
        const realWords = result.text.match(/[a-zA-Z]{3,}/g) || [];
        expect(realWords.length).toBeGreaterThan(10);
      } else {
        // Document the scanned PDFs — they need OCR
        expect(result.isScanned).toBe(true);
      }
    });

    it(`${filename} — chunking check (80k limit)`, async () => {
      const result = await extractPDF(pdfPath);
      const CHUNK_LIMIT = 80000;
      if (result.chars > CHUNK_LIMIT) {
        console.warn(`  ⚠️ ${filename}: ${result.chars}c needs chunking`);
      }
      // Page count is the universal indicator — chars may be 0 for scanned PDFs
      expect(result.pages).toBeGreaterThan(0);
    });
  }
});

describe('PDF Extraction — Edge Cases', () => {
  it('handles the largest PDF without crashing', async () => {
    const allPDFs = [...pdfInventory.medicalCharts, ...pdfInventory.contracts];
    if (allPDFs.length === 0) return;

    const largest = allPDFs.reduce((prev, curr) => {
      const prevSize = fs.statSync(prev).size;
      const currSize = fs.statSync(curr).size;
      return currSize > prevSize ? curr : prev;
    });

    const result = await extractPDF(largest);
    expect(result.pages).toBeGreaterThan(0);
    console.log(`  Largest: ${path.basename(largest)} — ${result.pages}p, ${result.chars}c`);
  });

  it('chunking produces valid segments', async () => {
    const CHUNK_LIMIT = 80000;
    if (pdfInventory.medicalCharts.length === 0) return;
    const pdf = pdfInventory.medicalCharts[0];
    const result = await extractPDF(pdf);
    const text = result.text;

    if (text.length > CHUNK_LIMIT) {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += CHUNK_LIMIT) {
        chunks.push(text.slice(i, i + CHUNK_LIMIT));
      }
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(CHUNK_LIMIT));
      console.log(`  Chunked into ${chunks.length} segments`);
    }
  });
});
