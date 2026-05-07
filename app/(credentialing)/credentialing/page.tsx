import Link from 'next/link';
import { db } from '@/lib/db';
import { peers, peerCredentialingLog, credentialerUsers } from '@/lib/db/schema';
import { and, count, eq, isNull, lte, lt, or, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Clock3, AlertOctagon, DollarSign } from 'lucide-react';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Phase 4 — credentialer dashboard. Three drill-down buckets:
 *   1. Newly Added — pending_credentialing AND no license_file_url
 *   2. Expiring Soon — active AND credential_valid_until <= today + 14d
 *   3. Expired — license_expired OR (active AND credential_valid_until < today)
 *
 * Plus a small earnings preview tile resolved from the demo_user cookie.
 */
export default async function CredentialingDashboard() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const in14 = new Date(today);
  in14.setUTCDate(in14.getUTCDate() + 14);
  const in14Iso = in14.toISOString().slice(0, 10);

  // Bucket 1: Newly Added (pending_credentialing, no license document)
  const [newlyAdded] = await db
    .select({ n: count() })
    .from(peers)
    .where(and(eq(peers.status, 'pending_credentialing'), isNull(peers.licenseFileUrl)));

  // Bucket 2: Expiring Soon (active, expiry within 14 days but still future)
  const [expiringSoon] = await db
    .select({ n: count() })
    .from(peers)
    .where(
      and(
        eq(peers.status, 'active'),
        sql`${peers.credentialValidUntil} is not null`,
        sql`${peers.credentialValidUntil} >= ${todayIso}::date`,
        sql`${peers.credentialValidUntil} <= ${in14Iso}::date`
      )
    );

  // Bucket 3: Expired (license_expired OR (active AND past expiry))
  const [expired] = await db
    .select({ n: count() })
    .from(peers)
    .where(
      or(
        eq(peers.status, 'license_expired'),
        and(
          eq(peers.status, 'active'),
          sql`${peers.credentialValidUntil} is not null`,
          sql`${peers.credentialValidUntil} < ${todayIso}::date`
        )
      )
    );

  // Earnings preview — month-to-date credentialed count for current credentialer
  const cookieStore = cookies();
  const raw = cookieStore.get('demo_user')?.value;
  let credentialerEmail = 'credentialing@peerspectiv.com';
  try {
    if (raw) credentialerEmail = JSON.parse(decodeURIComponent(raw)).email ?? credentialerEmail;
  } catch {
    /* ignore */
  }

  const [credUser] = await db
    .select({ id: credentialerUsers.id, perPeerRate: credentialerUsers.perPeerRate })
    .from(credentialerUsers)
    .where(eq(credentialerUsers.email, credentialerEmail))
    .limit(1);

  let mtdCount = 0;
  let mtdAmount = 0;
  if (credUser) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const [mtd] = await db
      .select({
        n: count(),
        total: sql<string>`coalesce(sum(${peerCredentialingLog.rateAtAction}),0)`,
      })
      .from(peerCredentialingLog)
      .where(
        and(
          eq(peerCredentialingLog.credentialerId, credUser.id),
          eq(peerCredentialingLog.action, 'marked_credentialed'),
          sql`${peerCredentialingLog.performedAt} >= ${monthStart}::date`
        )
      );
    mtdCount = Number(mtd?.n ?? 0);
    mtdAmount = Number(mtd?.total ?? 0);
  }

  const buckets = [
    {
      key: 'new',
      title: 'Newly added',
      description: 'Pending credentialing — license document not yet uploaded.',
      icon: UserPlus,
      count: Number(newlyAdded?.n ?? 0),
      dot: 'bg-status-info-dot',
      iconClass: 'text-status-info-dot',
    },
    {
      key: 'expiring',
      title: 'Expiring soon',
      description: 'Active peers whose license expires in the next 14 days.',
      icon: Clock3,
      count: Number(expiringSoon?.n ?? 0),
      dot: 'bg-status-warning-dot',
      iconClass: 'text-status-warning-dot',
    },
    {
      key: 'expired',
      title: 'Expired',
      description: 'License past expiry — peer cannot accept new assignments.',
      icon: AlertOctagon,
      count: Number(expired?.n ?? 0),
      dot: 'bg-status-danger-dot',
      iconClass: 'text-status-danger-dot',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Credentialing dashboard</h1>
        <p className="text-sm text-ink-secondary">
          Triage peer license status. Click a bucket to drill into matching peers.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {buckets.map((b) => (
          <Link
            key={b.key}
            href={`/credentialing/peers?bucket=${b.key}`}
            className="rounded-md border border-border-subtle bg-surface-card p-4 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                  <span className="eyebrow">{b.title}</span>
                </div>
                <div className="display-number">{b.count}</div>
              </div>
              <b.icon className={`h-5 w-5 ${b.iconClass}`} />
            </div>
            <p className="mt-3 text-xs text-ink-secondary">{b.description}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Earnings preview — month-to-date
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-sm text-ink-secondary">{mtdCount} peer{mtdCount === 1 ? '' : 's'} credentialed this month</div>
            <div className="mt-1 text-2xl font-medium text-ink-primary">
              ${mtdAmount.toFixed(2)}
            </div>
          </div>
          <Link
            href="/credentialing/earnings"
            className="rounded-md border border-border-default px-4 py-2 text-sm font-medium text-ink-primary hover:bg-ink-50"
          >
            View earnings →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
