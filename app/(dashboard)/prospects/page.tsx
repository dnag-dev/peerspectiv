import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { inArray, desc } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddProspectModal } from '@/components/prospects/AddProspectModal';
import { ProspectCard } from '@/components/prospects/ProspectCard';

export const dynamic = 'force-dynamic';

const STAGES = [
  {
    key: 'prospect',
    title: 'Prospect',
    accent: 'border-l-4 border-[#2E6FE8]',
    badgeClass: 'bg-[#2E6FE8] text-white',
  },
  {
    key: 'contract_sent',
    title: 'Contract Sent',
    accent: 'border-l-4 border-[#F59E0B]',
    badgeClass: 'bg-[#F59E0B] text-[#0B1829]',
  },
  {
    key: 'contract_signed',
    title: 'Contract Signed',
    accent: 'border-l-4 border-[#22C55E]',
    badgeClass: 'bg-[#22C55E] text-[#0B1829]',
  },
  {
    key: 'active',
    title: 'Active Client',
    accent: 'border-l-4 border-mint-500',
    badgeClass: 'bg-mint-500 text-white',
  },
] as const;

async function getPipeline() {
  const rows = await db
    .select()
    .from(companies)
    .where(inArray(companies.status, ['prospect', 'contract_sent', 'contract_signed', 'active']))
    .orderBy(desc(companies.createdAt));

  const grouped: Record<string, typeof rows> = {
    prospect: [],
    contract_sent: [],
    contract_signed: [],
    active: [],
  };

  for (const row of rows) {
    const s = row.status || 'prospect';
    if (grouped[s]) grouped[s].push(row);
  }

  return grouped;
}

export default async function ProspectsPage() {
  const pipeline = await getPipeline();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Prospect Pipeline</h1>
          <p className="text-sm text-ink-400">
            Track potential FQHC clients from first contact through contract signing and activation.
          </p>
        </div>
        <AddProspectModal />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const items = pipeline[stage.key] ?? [];
          return (
            <div
              key={stage.key}
              data-testid="pipeline-column"
              data-stage={stage.key}
              className={`flex min-h-[400px] flex-col rounded-lg bg-[#1A3050] p-3 ${stage.accent}`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                  {stage.title}
                </h2>
                <Badge className={`${stage.badgeClass} ml-2`}>{items.length}</Badge>
              </div>
              <div className="flex-1 space-y-2">
                {items.length === 0 ? (
                  <Card className="border-dashed border-ink-700 bg-transparent">
                    <CardContent className="py-6 text-center text-xs text-ink-500">
                      No {stage.title.toLowerCase()}
                    </CardContent>
                  </Card>
                ) : (
                  items.map((company) => (
                    <ProspectCard
                      key={company.id}
                      company={{
                        id: company.id,
                        name: company.name,
                        status: company.status ?? 'prospect',
                        contactPerson: company.contactPerson,
                        state: company.state,
                        annualReviewCount: company.annualReviewCount,
                        contractSentAt: company.contractSentAt
                          ? company.contractSentAt.toISOString()
                          : null,
                        createdAt: company.createdAt
                          ? company.createdAt.toISOString()
                          : null,
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
