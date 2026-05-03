import { db, toSnake } from '@/lib/db';
import { reviewers } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { CredentialsView } from '@/app/(dashboard)/credentials/CredentialsView';

export const dynamic = 'force-dynamic';

export default async function CredentialingCredentialsPage() {
  const rows = await db
    .select({
      id: reviewers.id,
      fullName: reviewers.fullName,
      email: reviewers.email,
      specialty: reviewers.specialty,
      specialties: reviewers.specialties,
      credentialValidUntil: reviewers.credentialValidUntil,
      status: reviewers.status,
      licenseNumber: reviewers.licenseNumber,
      licenseState: reviewers.licenseState,
    })
    .from(reviewers)
    .orderBy(asc(reviewers.fullName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Credentials</h1>
        <p className="text-sm text-ink-500">
          Track license expirations. Update credential dates to activate reviewers.
        </p>
      </div>

      <CredentialsView reviewers={rows.map((r) => toSnake(r))} />
    </div>
  );
}
