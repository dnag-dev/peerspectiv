import { db, toSnake } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { asc, sql } from 'drizzle-orm';
import { CredentialsView } from './CredentialsView';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

export default async function CredentialsPage() {
  noStore();
  const rows = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      specialty: sql<string | null>`(select specialty from peer_specialties where peer_id = ${peers.id} order by specialty limit 1)`,
      specialties: sql<string[]>`coalesce(array(select specialty from peer_specialties where peer_id = ${peers.id} order by specialty), '{}'::text[])`,
      credentialValidUntil: peers.credentialValidUntil,
      status: peers.status,
      licenseNumber: peers.licenseNumber,
      licenseState: peers.licenseState,
    })
    .from(peers)
    .orderBy(asc(peers.fullName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Credentials</h1>
        <p className="text-sm text-ink-secondary">
          Track license expirations. Peers with missing or expired credentials
          are automatically excluded from assignment.
        </p>
      </div>

      <CredentialsView peers={rows.map((r) => toSnake(r))} />
    </div>
  );
}
