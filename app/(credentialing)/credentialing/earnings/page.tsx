import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { credentialerUsers, peerCredentialingLog, peers } from '@/lib/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { startIso: start.toISOString().slice(0, 10), endIso: end.toISOString().slice(0, 10) };
}

export default async function CredentialerEarningsPage() {
  const raw = cookies().get('demo_user')?.value;
  let credentialerEmail = 'credentialing@peerspectiv.com';
  try {
    if (raw) credentialerEmail = JSON.parse(decodeURIComponent(raw)).email ?? credentialerEmail;
  } catch {
    /* ignore */
  }

  const [credUser] = await db
    .select({
      id: credentialerUsers.id,
      fullName: credentialerUsers.fullName,
      email: credentialerUsers.email,
      perPeerRate: credentialerUsers.perPeerRate,
    })
    .from(credentialerUsers)
    .where(eq(credentialerUsers.email, credentialerEmail))
    .limit(1);

  if (!credUser) {
    return (
      <EmptyState
        title="No credentialer profile"
        message={`No credentialer_users row for ${credentialerEmail}. Ask an admin to seed one.`}
        backHref="/credentialing"
      />
    );
  }

  const today = new Date();
  const { startIso: monthStart, endIso: monthEnd } = monthRange(
    today.getUTCFullYear(),
    today.getUTCMonth()
  );

  // Current month — list of peers credentialed
  const currentMonth = await db
    .select({
      peerId: peerCredentialingLog.peerId,
      peerName: peers.fullName,
      performedAt: peerCredentialingLog.performedAt,
      rateAtAction: peerCredentialingLog.rateAtAction,
    })
    .from(peerCredentialingLog)
    .leftJoin(peers, eq(peers.id, peerCredentialingLog.peerId))
    .where(
      and(
        eq(peerCredentialingLog.credentialerId, credUser.id),
        eq(peerCredentialingLog.action, 'marked_credentialed'),
        sql`${peerCredentialingLog.performedAt} >= ${monthStart}::date`,
        sql`${peerCredentialingLog.performedAt} < ${monthEnd}::date`
      )
    )
    .orderBy(desc(peerCredentialingLog.performedAt));

  const monthCount = currentMonth.length;
  const monthTotal = currentMonth.reduce(
    (acc, r) => acc + Number(r.rateAtAction ?? credUser.perPeerRate ?? 0),
    0
  );

  // Trend — prior 5 months
  const trend: { month: string; count: number; total: number }[] = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const { startIso, endIso } = monthRange(d.getUTCFullYear(), d.getUTCMonth());
    const [agg] = await db
      .select({
        n: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${peerCredentialingLog.rateAtAction}),0)`,
      })
      .from(peerCredentialingLog)
      .where(
        and(
          eq(peerCredentialingLog.credentialerId, credUser.id),
          eq(peerCredentialingLog.action, 'marked_credentialed'),
          sql`${peerCredentialingLog.performedAt} >= ${startIso}::date`,
          sql`${peerCredentialingLog.performedAt} < ${endIso}::date`
        )
      );
    trend.unshift({
      month: d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      count: Number(agg?.n ?? 0),
      total: Number(agg?.total ?? 0),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">My Earnings</h1>
        <p className="text-sm text-ink-secondary">
          {credUser.fullName} · current per-peer rate $
          {Number(credUser.perPeerRate ?? 0).toFixed(2)}. Prior credentialings retain
          their snapshotted rate.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-ink-primary">${monthTotal.toFixed(2)}</div>
            <div className="text-sm text-ink-secondary">{monthCount} peer{monthCount === 1 ? '' : 's'} credentialed</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Per-peer rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-ink-primary">
              ${Number(credUser.perPeerRate ?? 0).toFixed(2)}
            </div>
            <div className="text-sm text-ink-secondary">Locked in for prior credentialings at the rate active when work was completed</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Peers credentialed this month</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {currentMonth.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-ink-tertiary">
              No credentialings yet this month.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border-subtle bg-ink-50 text-xs uppercase tracking-wider text-ink-secondary">
                  <th className="px-4 py-2 text-left">Peer</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {currentMonth.map((r, i) => (
                  <tr key={`${r.peerId}-${i}`} className="border-b border-border-subtle">
                    <td className="px-4 py-2 text-ink-primary">{r.peerName ?? '—'}</td>
                    <td className="px-4 py-2 text-ink-secondary">
                      {r.performedAt ? new Date(r.performedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-ink-primary">
                      ${Number(r.rateAtAction ?? credUser.perPeerRate ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prior 5 months</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border-subtle bg-ink-50 text-xs uppercase tracking-wider text-ink-secondary">
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-right">Peers</th>
                <th className="px-4 py-2 text-right">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((r) => (
                <tr key={r.month} className="border-b border-border-subtle">
                  <td className="px-4 py-2 text-ink-primary">{r.month}</td>
                  <td className="px-4 py-2 text-right text-ink-secondary">{r.count}</td>
                  <td className="px-4 py-2 text-right text-ink-primary">${r.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
