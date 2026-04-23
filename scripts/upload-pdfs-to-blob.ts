import { put } from '@vercel/blob';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.vercel.local' });

const PDF_DIR = '/Users/dlnagalla/Downloads/peerspectiv AI docs';

async function main() {
  const files = readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${files.length} PDFs`);

  const results: { filename: string; url: string }[] = [];
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const buf = readFileSync(join(PDF_DIR, filename));
    const blob = await put(`charts/${filename}`, buf, {
      access: 'public',
      contentType: 'application/pdf',
      allowOverwrite: true,
    });
    results.push({ filename, url: blob.url });
    console.log(`[${i + 1}/${files.length}] ${filename} -> ${blob.url}`);
  }

  const fs = await import('fs');
  fs.writeFileSync('scripts/blob-urls.json', JSON.stringify(results, null, 2));
  console.log(`\nWrote scripts/blob-urls.json (${results.length} entries)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
