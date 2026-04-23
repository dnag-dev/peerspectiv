import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

type BlobEntry = { filename: string; url: string };

async function main() {
  const entries: BlobEntry[] = JSON.parse(
    readFileSync('scripts/blob-urls.json', 'utf8')
  );
  console.log(`Loaded ${entries.length} blob URLs`);

  const sql = neon(process.env.DATABASE_URL!);

  // Fetch all cases — match by chart_file_path basename (filename) or by case id patterns
  const cases = (await sql`
    SELECT id, chart_file_path, specialty_required AS specialty
    FROM review_cases
    ORDER BY created_at ASC
  `) as Array<{ id: string; chart_file_path: string | null; specialty: string | null }>;

  console.log(`Found ${cases.length} review_cases`);

  // Index blobs by lowercased filename
  const byName = new Map<string, string>();
  for (const e of entries) {
    byName.set(e.filename.toLowerCase(), e.url);
  }

  let matched = 0;
  let updatedByBasename = 0;
  let assignedRoundRobin = 0;

  // Round-robin list by specialty for unassigned cases
  const bySpecialty: Record<string, BlobEntry[]> = {};
  for (const e of entries) {
    const lower = e.filename.toLowerCase();
    let spec = 'general';
    if (lower.includes('ob') || lower.includes('gyn')) spec = 'obgyn';
    else if (lower.includes('hiv')) spec = 'hiv';
    else if (lower.includes('mental')) spec = 'mental_health';
    else if (lower.includes('pediatric')) spec = 'pediatrics';
    else if (lower.includes('dental')) spec = 'dental';
    else if (lower.includes('acupuncture')) spec = 'acupuncture';
    else if (lower.includes('chiro')) spec = 'chiropractic';
    else if (lower.includes('podiatry')) spec = 'podiatry';
    (bySpecialty[spec] ??= []).push(e);
    (bySpecialty['any'] ??= []).push(e);
  }

  const cursor: Record<string, number> = {};
  function pickFor(spec: string | null): BlobEntry {
    const key = spec && bySpecialty[spec]?.length ? spec : 'any';
    const list = bySpecialty[key]!;
    const i = cursor[key] ?? 0;
    cursor[key] = (i + 1) % list.length;
    return list[i];
  }

  for (const c of cases) {
    let newUrl: string | null = null;

    if (c.chart_file_path) {
      const base = c.chart_file_path.split('/').pop()?.toLowerCase();
      if (base && byName.has(base)) {
        newUrl = byName.get(base)!;
        updatedByBasename++;
      }
    }

    if (!newUrl) {
      newUrl = pickFor(c.specialty).url;
      assignedRoundRobin++;
    }

    await sql`
      UPDATE review_cases
      SET chart_file_path = ${newUrl}
      WHERE id = ${c.id}
    `;
    matched++;
  }

  console.log(`Updated ${matched} cases`);
  console.log(`  - matched by basename: ${updatedByBasename}`);
  console.log(`  - round-robin by specialty: ${assignedRoundRobin}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
