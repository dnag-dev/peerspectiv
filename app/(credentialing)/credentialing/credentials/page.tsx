import { db, toSnake } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { CredentialsView } from '@/app/(dashboard)/credentials/CredentialsView';

export const dynamic = 'force-dynamic';

export default async function CredentialingCredentialsPage() {
  const rows = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      specialty: peers.specialty,
      specialties: peers.specialties,
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
        <h1 className="text-2xl font-bold text-ink-900">Credentials</h1>
        <p className="text-sm text-ink-500">
          Track license expirations. Update credential dates to activate peers.
        </p>
      </div>

      <CredentialsView peers={rows.map((r) => toSnake(r))} />
    </div>
  );
}
