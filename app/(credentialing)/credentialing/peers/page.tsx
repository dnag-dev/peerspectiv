import Link from 'next/link';
import { db } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

const BUCKET_META: Record<string, { title: string; empty: string }> = {
  new: {
    title: 'Newly Added — pending credentialing',
    empty: 'No peers awaiting credentialing right now.',
  },
  expiring: {
    title: 'Expiring Soon — license expires within 14 days',
    empty: 'No active peers with licenses expiring soon.',
  },
  expired: {
    title: 'Expired — license past expiry or peer in license_expired state',
    empty: 'No expired licenses on file.',
  },
};

export default async function CredentialingPeersListPage({
  searchParams,
}: {
  searchParams: { bucket?: string };
}) {
  const bucket = searchParams.bucket ?? 'new';
  const meta = BUCKET_META[bucket] ?? BUCKET_META.new;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const in14 = new Date(today);
  in14.setUTCDate(in14.getUTCDate() + 14);
  const in14Iso = in14.toISOString().slice(0, 10);

  let where;
  if (bucket === 'expiring') {
    where = and(
      eq(peers.state, 'active'),
      sql`${peers.credentialValidUntil} is not null`,
      sql`${peers.credentialValidUntil} >= ${todayIso}::date`,
      sql`${peers.credentialValidUntil} <= ${in14Iso}::date`
    );
  } else if (bucket === 'expired') {
    where = or(
      eq(peers.state, 'license_expired'),
      and(
        eq(peers.state, 'active'),
        sql`${peers.credentialValidUntil} is not null`,
        sql`${peers.credentialValidUntil} < ${todayIso}::date`
      )
    );
  } else {
    where = and(eq(peers.state, 'pending_credentialing'), isNull(peers.licenseFileUrl));
  }

  const rows = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      state: peers.state,
      licenseNumber: peers.licenseNumber,
      licenseState: peers.licenseState,
      credentialValidUntil: peers.credentialValidUntil,
      hasDocument: sql<boolean>`(${peers.licenseFileUrl} is not null)`,
    })
    .from(peers)
    .where(where)
    .orderBy(asc(peers.fullName));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <Link href="/credentialing" className="text-sm text-status-info-dot hover:underline">← Dashboard</Link>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">{meta.title}</h1>
        <span className="text-sm text-ink-secondary">({rows.length})</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing to triage" message={meta.empty} backHref="/credentialing" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{rows.length} peer{rows.length === 1 ? '' : 's'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border-subtle bg-ink-50 text-xs uppercase tracking-wider text-ink-secondary">
                    <th className="px-4 py-2 text-left">Peer</th>
                    <th className="px-4 py-2 text-left">State</th>
                    <th className="px-4 py-2 text-left">License</th>
                    <th className="px-4 py-2 text-left">Expires</th>
                    <th className="px-4 py-2 text-left">Document</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border-subtle hover:bg-ink-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-ink-primary">{r.fullName ?? '—'}</div>
                        <div className="text-xs text-ink-secondary">{r.email ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2">
                        <Badge className="bg-ink-100 text-ink-primary border-0">{r.state}</Badge>
                      </td>
                      <td className="px-4 py-2 text-ink-secondary">
                        {r.licenseNumber
                          ? `${r.licenseNumber}${r.licenseState ? ` (${r.licenseState})` : ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-ink-secondary">
                        {r.credentialValidUntil
                          ? String(r.credentialValidUntil).slice(0, 10)
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-ink-secondary">{r.hasDocument ? 'On file' : '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/credentialing/peers/${r.id}`}
                          className="rounded-md border border-border-default px-3 py-1 text-xs font-medium text-ink-primary hover:bg-ink-50"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
