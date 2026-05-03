import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import {
  peers,
  peerSpecialties,
  peerStateAudit,
  peerCredentialingLog,
} from '@/lib/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PeerCredentialingDetail } from './PeerCredentialingDetail';

export const dynamic = 'force-dynamic';

export default async function CredentialingPeerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [peer] = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      npi: peers.npi,
      state: peers.state,
      stateChangedAt: peers.stateChangedAt,
      stateChangedBy: peers.stateChangedBy,
      stateChangeReason: peers.stateChangeReason,
      licenseNumber: peers.licenseNumber,
      licenseState: peers.licenseState,
      licenseFileUrl: peers.licenseFileUrl,
      credentialValidUntil: peers.credentialValidUntil,
    })
    .from(peers)
    .where(eq(peers.id, params.id))
    .limit(1);

  if (!peer) notFound();

  const specs = await db
    .select({
      specialty: peerSpecialties.specialty,
      verifiedStatus: peerSpecialties.verifiedStatus,
      verifiedAt: peerSpecialties.verifiedAt,
    })
    .from(peerSpecialties)
    .where(eq(peerSpecialties.peerId, params.id))
    .orderBy(asc(peerSpecialties.specialty));

  const stateAudit = await db
    .select({
      fromState: peerStateAudit.fromState,
      toState: peerStateAudit.toState,
      changedBy: peerStateAudit.changedBy,
      changeReason: peerStateAudit.changeReason,
      changedAt: peerStateAudit.changedAt,
    })
    .from(peerStateAudit)
    .where(eq(peerStateAudit.peerId, params.id))
    .orderBy(desc(peerStateAudit.changedAt));

  const credLog = await db
    .select({
      action: peerCredentialingLog.action,
      validUntilOld: peerCredentialingLog.validUntilOld,
      validUntilNew: peerCredentialingLog.validUntilNew,
      documentUrl: peerCredentialingLog.documentUrl,
      notes: peerCredentialingLog.notes,
      performedAt: peerCredentialingLog.performedAt,
    })
    .from(peerCredentialingLog)
    .where(eq(peerCredentialingLog.peerId, params.id))
    .orderBy(desc(peerCredentialingLog.performedAt));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <Link href="/credentialing" className="text-sm text-cobalt-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-ink-900">{peer.fullName ?? 'Peer'}</h1>
        <Badge className="bg-ink-100 text-ink-700 border-0">{peer.state}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-ink-500">Email</span><div>{peer.email ?? '—'}</div></div>
          <div><span className="text-ink-500">NPI</span><div>{peer.npi ?? '—'}</div></div>
          <div className="col-span-2">
            <span className="text-ink-500">Last state change</span>
            <div>
              {peer.stateChangedAt
                ? `${new Date(peer.stateChangedAt).toLocaleString()} by ${peer.stateChangedBy ?? '—'}${peer.stateChangeReason ? ` — ${peer.stateChangeReason}` : ''}`
                : '—'}
            </div>
          </div>
        </CardContent>
      </Card>

      <PeerCredentialingDetail
        peer={{
          id: peer.id,
          state: peer.state,
          license_number: peer.licenseNumber,
          license_state: peer.licenseState,
          license_document_url: peer.licenseFileUrl,
          credential_valid_until: peer.credentialValidUntil
            ? String(peer.credentialValidUntil).slice(0, 10)
            : null,
        }}
        specialties={specs.map((s) => ({
          specialty: s.specialty,
          verified_status: s.verifiedStatus,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {credLog.length === 0 && stateAudit.length === 0 ? (
            <div className="text-ink-500">No history yet.</div>
          ) : (
            <>
              {credLog.map((r, i) => (
                <div key={`c${i}`} className="rounded border border-ink-100 p-2">
                  <div className="font-medium text-ink-900">[credentialing] {r.action}</div>
                  <div className="text-xs text-ink-500">
                    {r.performedAt ? new Date(r.performedAt).toLocaleString() : '—'}
                    {r.validUntilOld || r.validUntilNew
                      ? ` · expiry ${String(r.validUntilOld ?? '—').slice(0, 10)} → ${String(r.validUntilNew ?? '—').slice(0, 10)}`
                      : ''}
                    {r.notes ? ` · ${r.notes}` : ''}
                  </div>
                </div>
              ))}
              {stateAudit.map((r, i) => (
                <div key={`s${i}`} className="rounded border border-ink-100 p-2">
                  <div className="font-medium text-ink-900">
                    [state] {r.fromState ?? '∅'} → {r.toState}
                  </div>
                  <div className="text-xs text-ink-500">
                    {r.changedAt ? new Date(r.changedAt).toLocaleString() : '—'} · {r.changedBy ?? '—'}
                    {r.changeReason ? ` · ${r.changeReason}` : ''}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
