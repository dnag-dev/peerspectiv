import { db, toSnake } from '@/lib/db';
import { peers, peerSpecialties } from '@/lib/db/schema';
import { asc, eq, sql } from 'drizzle-orm';
import { PeersTable } from './PeersTable';
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = 'force-dynamic';

export default async function PeersPage() {
  noStore();
  // Phase 1.3: hydrate specialties from peer_specialties join (back-compat shape).
  // Note: drizzle's ${peers.id} interpolates as the bare column name "id" inside
  // the correlated subquery, which collides with peer_specialties.id. Use the
  // fully-qualified table name to keep the correlation pinned to the outer
  // peers row.
  const rows = await db
    .select({
      peer: peers,
      specialties: sql<string[]>`coalesce(array(select specialty from peer_specialties where peer_id = peers.id order by specialty), '{}'::text[])`,
    })
    .from(peers)
    .orderBy(asc(peers.fullName));

  const enriched = rows.map((r) => ({
    ...toSnake<Record<string, unknown>>(r.peer),
    specialties: r.specialties ?? [],
    specialty: (r.specialties && r.specialties[0]) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Peers</h1>
        <p className="text-sm text-ink-500">
          Manage peer peers, compensation, and availability
        </p>
      </div>

      <PeersTable peers={enriched as any} />
    </div>
  );
}
