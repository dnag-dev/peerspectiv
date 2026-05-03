import Link from 'next/link';
import { db } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function NewPeerInboxPage() {
  const list = await db
    .select({
      id: peers.id,
      full_name: peers.fullName,
      email: peers.email,
      specialty: sql<string | null>`(select specialty from peer_specialties where peer_id = ${peers.id} order by specialty limit 1)`,
      specialties: sql<string[]>`coalesce(array(select specialty from peer_specialties where peer_id = ${peers.id} order by specialty), '{}'::text[])`,
      license_number: peers.licenseNumber,
      license_state: peers.licenseState,
      credential_valid_until: peers.credentialValidUntil,
      created_at: peers.createdAt,
      board_certification: peers.boardCertification,
    })
    .from(peers)
    .where(eq(peers.status, 'inactive'))
    .orderBy(desc(peers.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">New Peer Inbox</h1>
        <p className="text-sm text-ink-500">
          Peers awaiting credentialing review. Set a credential expiry date to
          activate them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending review
            <span className="text-sm font-normal text-ink-500">({list.length})</span>
            <Badge className="ml-auto bg-amber-100 text-amber-700 border-0">Inactive</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-ink-400">
              No peers waiting.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-ink-200 bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-2 text-left">Peer</th>
                    <th className="px-4 py-2 text-left">Specialties</th>
                    <th className="px-4 py-2 text-left">License</th>
                    <th className="px-4 py-2 text-left">Board Cert</th>
                    <th className="px-4 py-2 text-left">Submitted</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const specs =
                      Array.isArray(r.specialties) && r.specialties.length > 0
                        ? r.specialties.join(', ')
                        : r.specialty ?? '—';
                    const created = r.created_at
                      ? new Date(r.created_at).toLocaleDateString()
                      : '—';
                    return (
                      <tr key={r.id} className="border-b border-ink-100 hover:bg-ink-50">
                        <td className="px-4 py-2">
                          <div className="font-medium text-ink-900">
                            {r.full_name ?? '—'}
                          </div>
                          <div className="text-xs text-ink-500">{r.email ?? '—'}</div>
                        </td>
                        <td className="px-4 py-2 text-ink-600">{specs}</td>
                        <td className="px-4 py-2 text-ink-600">
                          {r.license_number
                            ? `${r.license_number}${r.license_state ? ` (${r.license_state})` : ''}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-ink-600">
                          {r.board_certification ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-ink-600">{created}</td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href="/credentialing/credentials"
                            className="rounded-md border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
                          >
                            Review credentials
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
