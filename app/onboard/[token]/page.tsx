import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { peerInviteTokens, specialtyTaxonomy } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { OnboardForm } from './OnboardForm';

export const dynamic = 'force-dynamic';

function tokenStatus(row: typeof peerInviteTokens.$inferSelect) {
  if (row.acceptedAt || row.peerId) return 'accepted';
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return 'expired';
  if (row.submissionStatus === 'rejected') return 'rejected';
  if (row.submissionStatus === 'submitted') return 'submitted';
  return 'open';
}

export default async function PathAOnboardPage({ params }: { params: { token: string } }) {
  const [row] = await db
    .select()
    .from(peerInviteTokens)
    .where(eq(peerInviteTokens.token, params.token))
    .limit(1);
  if (!row) notFound();

  const status = tokenStatus(row);
  const specialties = await db
    .select({ name: specialtyTaxonomy.name })
    .from(specialtyTaxonomy)
    .where(eq(specialtyTaxonomy.isActive, true))
    .orderBy(asc(specialtyTaxonomy.name));

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink-900">Peerspectiv peer application</h1>
      <p className="mt-1 text-sm text-ink-500">
        Email on file: <strong>{row.peerEmail}</strong>
      </p>

      {status === 'expired' && (
        <div className="mt-6 rounded border border-rose-200 bg-rose-50 p-4 text-rose-800">
          This invite has expired. Please contact the team to issue a new link.
        </div>
      )}
      {status === 'accepted' && (
        <div className="mt-6 rounded border border-mint-200 bg-mint-50 p-4 text-mint-800">
          This invite was already accepted.
        </div>
      )}
      {status === 'rejected' && (
        <div className="mt-6 rounded border border-rose-200 bg-rose-50 p-4 text-rose-800">
          This application was rejected.
        </div>
      )}
      {status === 'submitted' && (
        <div className="mt-6 rounded border border-cobalt-200 bg-cobalt-50 p-4 text-cobalt-800">
          Application submitted — thank you. The team will be in touch.
        </div>
      )}
      {status === 'open' && (
        <OnboardForm
          token={params.token}
          email={row.peerEmail}
          specialties={specialties.map((s) => s.name)}
        />
      )}
    </main>
  );
}
