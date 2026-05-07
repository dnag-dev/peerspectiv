import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { inArray, desc } from 'drizzle-orm';
import { AddProspectModal } from '@/components/prospects/AddProspectModal';
import { PipelineBoard } from '@/components/prospects/PipelineBoard';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

const STAGE_KEYS = [
  'lead',
  'prospect',
  'contract_sent',
  'contract_signed',
  'active_client',
] as const;

async function getPipeline() {
  const rows = await db
    .select()
    .from(companies)
    .where(
      inArray(companies.status, [
        'lead',
        'prospect',
        'contract_sent',
        'contract_signed',
        // Backwards compat: legacy 'active' rows still flow into Active Client.
        'active',
        'active_client',
      ])
    )
    .orderBy(desc(companies.createdAt));

  const grouped: Record<string, typeof rows> = {
    lead: [],
    prospect: [],
    contract_sent: [],
    contract_signed: [],
    active_client: [],
  };

  for (const row of rows) {
    const raw = row.status || 'prospect';
    const s = raw === 'active' ? 'active_client' : raw;
    if (grouped[s]) grouped[s].push(row);
  }

  return grouped;
}

export default async function ProspectsPage() {
  noStore();
  const pipeline = await getPipeline();

  // Serialize for the client board.
  const serialized: Record<string, ReturnType<typeof toCardProps>[]> = {};
  for (const key of STAGE_KEYS) {
    serialized[key] = (pipeline[key] ?? []).map(toCardProps);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Workspace · admin</p>
          <h1 className="mt-0.5 text-xl font-medium tracking-tight text-ink-primary">Prospect pipeline</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Track potential FQHC clients from first contact through contract signing, activation, and active review cycles.
          </p>
        </div>
        <AddProspectModal stayOnPage />
      </div>

      <PipelineBoard initialPipeline={serialized} />
    </div>
  );
}

function toCardProps(company: {
  id: string;
  name: string;
  status: string | null;
  contactPerson: string | null;
  state: string | null;
  annualReviewCount: number | null;
  contractSentAt: Date | null;
  createdAt: Date | null;
}) {
  const raw = company.status || 'prospect';
  return {
    id: company.id,
    name: company.name,
    status: raw === 'active' ? 'active_client' : raw,
    contactPerson: company.contactPerson,
    state: company.state,
    annualReviewCount: company.annualReviewCount,
    contractSentAt: company.contractSentAt
      ? company.contractSentAt.toISOString()
      : null,
    createdAt: company.createdAt ? company.createdAt.toISOString() : null,
  };
}
