'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SpecialtyRow {
  specialty: string;
  verified_status: string;
}

interface Props {
  peer: {
    id: string;
    state: string;
    license_number: string | null;
    license_state: string | null;
    license_document_url: string | null;
    credential_valid_until: string | null;
  };
  specialties: SpecialtyRow[];
}

const STATUS_OPTIONS = ['verified', 'not_verified', 'pending'] as const;

export function PeerCredentialingDetail({ peer, specialties: initialSpecs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [specs, setSpecs] = useState<SpecialtyRow[]>(initialSpecs);
  const [newSpec, setNewSpec] = useState('');
  const [licenseNumber, setLicenseNumber] = useState(peer.license_number ?? '');
  const [licenseState, setLicenseState] = useState(peer.license_state ?? '');
  const [docUrl, setDocUrl] = useState(peer.license_document_url ?? '');
  const [expiry, setExpiry] = useState(peer.credential_valid_until ?? '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const hasDocument = Boolean(docUrl || peer.license_document_url);
  const isPending_ = peer.state === 'pending_credentialing';

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function patchSpecialty(specialty: string, verified_status: string) {
    setError(null);
    const res = await fetch(`/api/peers/${peer.id}/specialties`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ specialty, verified_status }),
    });
    if (!res.ok) {
      setError('Failed to update specialty');
      return;
    }
    setSpecs((cur) =>
      cur.map((s) => (s.specialty === specialty ? { ...s, verified_status } : s))
    );
  }

  async function addSpecialty() {
    const v = newSpec.trim();
    if (!v) return;
    setError(null);
    const res = await fetch(`/api/peers/${peer.id}/specialties`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ specialty: v }),
    });
    if (!res.ok) {
      setError('Failed to add specialty');
      return;
    }
    setSpecs((cur) =>
      cur.find((s) => s.specialty === v)
        ? cur
        : [...cur, { specialty: v, verified_status: 'pending' }].sort((a, b) =>
            a.specialty.localeCompare(b.specialty)
          )
    );
    setNewSpec('');
  }

  async function removeSpecialty(specialty: string) {
    setError(null);
    const res = await fetch(
      `/api/peers/${peer.id}/specialties?specialty=${encodeURIComponent(specialty)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      setError('Failed to remove specialty');
      return;
    }
    setSpecs((cur) => cur.filter((s) => s.specialty !== specialty));
  }

  async function saveLicense() {
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/credentialing/peers/${peer.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        license_number: licenseNumber || null,
        license_state: licenseState || null,
        license_document_url: docUrl || null,
        credential_valid_until: expiry || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Failed to save license');
      return;
    }
    const j = await res.json();
    setInfo(j.transitioned ? 'License renewed — peer reactivated to active.' : 'License updated.');
    refresh();
  }

  async function markCredentialed() {
    setError(null);
    setInfo(null);
    if (!hasDocument) {
      setError('License document required before marking credentialed.');
      return;
    }
    const valid_until = window.prompt(
      'Set credential valid-until (YYYY-MM-DD):',
      expiry || ''
    );
    if (!valid_until) return;
    const res = await fetch(`/api/credentialing/peers/${peer.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential_valid_until: valid_until }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Failed to mark credentialed');
      return;
    }
    setInfo('Peer activated.');
    refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Specialties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {specs.length === 0 ? (
            <div className="text-sm text-ink-secondary">No specialties on file.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {specs.map((s) => (
                  <tr key={s.specialty} className="border-b border-border-subtle">
                    <td className="py-2">{s.specialty}</td>
                    <td className="py-2">
                      <select
                        value={s.verified_status}
                        onChange={(e) => patchSpecialty(s.specialty, e.target.value)}
                        className="rounded border border-border-subtle bg-surface-canvas px-2 py-1 text-xs"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeSpecialty(s.specialty)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex gap-2 pt-2">
            <input
              value={newSpec}
              onChange={(e) => setNewSpec(e.target.value)}
              placeholder="Add specialty…"
              className="flex-1 rounded border border-border-subtle bg-surface-canvas px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={addSpecialty}
              className="rounded-md border border-border-default px-3 py-1 text-xs font-medium text-ink-primary hover:bg-ink-50"
            >
              Add
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>License</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <div className="text-xs text-ink-secondary">License number</div>
              <input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full rounded border border-border-subtle px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <div className="text-xs text-ink-secondary">State</div>
              <input
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                className="w-full rounded border border-border-subtle px-2 py-1"
              />
            </label>
            <label className="space-y-1 col-span-2">
              <div className="text-xs text-ink-secondary">Document URL</div>
              <input
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded border border-border-subtle px-2 py-1"
              />
              {peer.license_document_url && (
                <a
                  href={peer.license_document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-status-info-dot hover:underline"
                >
                  Download current document
                </a>
              )}
            </label>
            <label className="space-y-1">
              <div className="text-xs text-ink-secondary">Valid until</div>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full rounded border border-border-subtle px-2 py-1"
              />
            </label>
            <div className="flex items-end">
              <Badge className="bg-ink-100 text-ink-primary border-0">
                {hasDocument ? 'Document on file' : 'No document'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={saveLicense}
              disabled={isPending}
              className="rounded-md bg-brand-hover px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              Save license
            </button>

            {isPending_ && (
              <button
                type="button"
                onClick={markCredentialed}
                disabled={!hasDocument || isPending}
                title={!hasDocument ? 'License document required' : 'Mark this peer credentialed'}
                className="rounded-md bg-status-success-dot px-4 py-2 text-sm font-medium text-white hover:bg-mint-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark Credentialed
              </button>
            )}

            {error && <span className="text-sm text-rose-600">{error}</span>}
            {info && <span className="text-sm text-status-success-fg">{info}</span>}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
