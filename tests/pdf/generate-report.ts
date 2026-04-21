import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { pdfInventory, getSpecialtyForFile } from './pdf-inventory';
import { extractPDF } from './extract-helper';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateReport() {
  console.log('\n📊 PEERSPECTIV PDF TEST REPORT');
  console.log('================================\n');

  const allPDFs = [
    ...pdfInventory.medicalCharts.map((p) => ({ path: p, type: 'Medical Chart' })),
    ...pdfInventory.contracts.map((p) => ({ path: p, type: 'Contract' })),
    ...pdfInventory.reviewForms.map((p) => ({ path: p, type: 'Review Form' })),
    ...pdfInventory.reports.map((p) => ({ path: p, type: 'Report' })),
  ];

  console.log(`Total PDFs found: ${allPDFs.length}`);
  console.log(`  Medical Charts: ${pdfInventory.medicalCharts.length}`);
  console.log(`  Contracts:      ${pdfInventory.contracts.length}`);
  console.log(`  Review Forms:   ${pdfInventory.reviewForms.length}`);
  console.log(`  Reports:        ${pdfInventory.reports.length}\n`);

  const results: any[] = [];
  let scannedCount = 0;
  let analyzedCount = 0;
  let aiFailCount = 0;
  let methodCounts = { 'pdf-parse': 0, 'claude-native': 0, failed: 0 };

  for (const { path: pdfPath, type } of allPDFs) {
    const filename = path.basename(pdfPath);
    process.stdout.write(`Processing ${filename}...`);

    try {
      const ex = await extractPDF(pdfPath);
      const sizeBytes = fs.statSync(pdfPath).size;
      const specialty = getSpecialtyForFile(pdfPath);
      methodCounts[ex.method as keyof typeof methodCounts] =
        (methodCounts[ex.method as keyof typeof methodCounts] ?? 0) + 1;

      let aiResult: any = null;
      let aiError: string | null = null;

      if (ex.method === 'failed' || ex.chars < 100) {
        scannedCount++;
        process.stdout.write(' ⚠ no extractable text\n');
      } else if (type === 'Medical Chart') {
        try {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 800,
            messages: [
              {
                role: 'user',
                content: `Analyze this medical chart. Return ONLY valid JSON, no preamble:
{"chart_summary": "2 sentence summary", "suggested_score": 0_to_100, "risk_flags_count": number, "top_concern": "string"}

Specialty: ${specialty}
Chart: ${ex.text.slice(0, 60000)}`,
              },
            ],
          });
          const block = response.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
          const raw = block?.text ?? '{}';
          aiResult = JSON.parse(raw.replace(/```json|```/g, '').trim());
          analyzedCount++;
          process.stdout.write(' ✅\n');
        } catch (e: any) {
          aiError = e.message;
          aiFailCount++;
          process.stdout.write(` ❌ AI fail: ${e.message.slice(0, 50)}\n`);
        }
      } else {
        process.stdout.write(' ✓ extracted\n');
      }

      results.push({
        filename,
        type,
        specialty,
        pages: ex.pages,
        words: ex.words,
        chars: ex.chars,
        sizeKB: Math.round(sizeBytes / 1024),
        isScanned: ex.isScanned,
        method: ex.method,
        needsChunking: ex.chars > 80000,
        aiResult,
        aiError,
        status: ex.method === 'failed' ? 'EXTRACT_FAIL' : aiError ? 'AI_FAIL' : '✅',
      });
    } catch (err: any) {
      results.push({ filename, type, status: '❌', error: err.message });
      process.stdout.write(` ❌ ${err.message}\n`);
    }
  }

  console.log('\n\n📋 DETAILED RESULTS\n');
  for (const r of results) {
    const tag = r.status === '✅' ? '✅' : r.status === 'SCANNED' ? '⚠ ' : '❌';
    console.log(`${tag} ${r.filename}`);
    console.log(`   ${r.specialty} • ${r.pages}p • ${r.words}w • ${r.chars}c • ${r.sizeKB}KB${r.needsChunking ? ' • CHUNKED' : ''}`);
    if (r.aiResult) {
      console.log(`   Score: ${r.aiResult.suggested_score}/100 • Flags: ${r.aiResult.risk_flags_count}`);
      console.log(`   Summary: ${r.aiResult.chart_summary}`);
      console.log(`   Top concern: ${r.aiResult.top_concern}`);
    }
    if (r.isScanned) console.log(`   Scanned PDF — needs OCR for AI analysis`);
    if (r.aiError) console.log(`   AI error: ${r.aiError}`);
    if (r.error) console.log(`   Error: ${r.error}`);
    console.log();
  }

  console.log('\n📈 SUMMARY');
  console.log('=' .repeat(50));
  console.log(`  Total processed:    ${results.length}`);
  console.log(`  AI-analyzed:        ${analyzedCount}`);
  console.log(`  Extraction failed:  ${scannedCount}`);
  console.log(`  AI call failures:   ${aiFailCount}`);
  console.log(`\n  Extraction methods used:`);
  console.log(`    pdf-parse (text):     ${methodCounts['pdf-parse']}`);
  console.log(`    claude-native (vision): ${methodCounts['claude-native']}`);
  console.log(`    failed:                 ${methodCounts.failed}`);

  const outDir = path.join(__dirname);
  fs.writeFileSync(path.join(outDir, 'pdf-test-report.json'), JSON.stringify(results, null, 2));
  console.log(`\nReport saved to: tests/pdf/pdf-test-report.json`);
}

generateReport().catch((e) => {
  console.error('Report generation failed:', e);
  process.exit(1);
});
