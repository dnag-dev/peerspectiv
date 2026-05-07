import { db, toSnake } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { asc, sql } from 'drizzle-orm';
import { CredentialsView } from '@/app/(dashboard)/credentials/CredentialsView';

export const dynamic = 'force-dynamic';

export default async function CredentialingCredentialsPage() {
  const rows = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      // Phase 1.3: pull from peer_specialties join. specialty = first element for back-compat.
      specialties: sql<string[]>`coalesce(array(select specialty from peer_specialties where peer_id = peers.id order by specialty), '{}'::text[])`,
      specialty: sql<string | null>`(select specialty from peer_specialties where peer_id = peers.id order by specialty limit 1)`,
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
          Track license expirations. Update credential dates to activate peers.
        </p>
      </div>

      <CredentialsView peers={rows.map((r) => toSnake(r))} />
    </div>
  );
}
