'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Peer {
  id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  specialties: string[] | null;
  credential_valid_until: string | null;
  status: string | null;
  license_number: string | null;
  license_state: string | null;
}

type Bucket = 'missing' | 'expired' | 'expiring' | 'valid';

function specialtiesText(r: Peer): string {
  if (Array.isArray(r.specialties) && r.specialties.length > 0) {
    return r.specialties.join(', ');
  }
  return r.specialty ?? '—';
}

function dayDiff(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime();
  const b = new Date(toIso + 'T00:00:00Z').getTime();
  return Math.round((a - b) / 86400000);
}

function bucketize(r: Peer, today: string): Bucket {
  if (!r.credential_valid_until) return 'missing';
  const cv = String(r.credential_valid_until).slice(0, 10);
  if (cv < today) return 'expired';
  const diff = dayDiff(cv, today);
  if (diff <= 60) return 'expiring';
  return 'valid';
}

export function CredentialsView({ peers: initial }: { peers: Peer[] }) {
  const router = useRouter();
  const [peers, setPeers] = useState<Peer[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return peers;
    return peers.filter((r) =>
      (r.full_name ?? '').toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      specialtiesText(r).toLowerCase().includes(q) ||
      (r.license_number ?? '').toLowerCase().includes(q) ||
      (r.license_state ?? '').toLowerCase().includes(q)
    );
  }, [peers, searchQ]);

  const grouped = useMemo(() => {
    const buckets: Record<Bucket, Peer[]> = {
      missing: [],
      expired: [],
      expiring: [],
      valid: [],
    };
    for (const r of filtered) buckets[bucketize(r, today)].push(r);
    // Sort within bucket: soonest expiring first
    const cmp = (a: Peer, b: Peer) => {
      const av = a.credential_valid_until ?? '9999-12-31';
      const bv = b.credential_valid_until ?? '9999-12-31';
      return String(av).localeCompare(String(bv));
    };
    for (const k of Object.keys(buckets) as Bucket[]) buckets[k].sort(cmp);
    return buckets;
  }, [filtered, today]);

  function startEdit(r: Peer) {
    setEditingId(r.id);
    setEditValue(r.credential_valid_until ? String(r.credential_valid_until).slice(0, 10) : '');
    setError(null);
  }

  async function saveEdit(r: Peer) {
    setSavingId(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/peers/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential_valid_until: editValue || null,
          // If we're setting an expiry, also flip to active so the peer can
          // receive assignments. (This mirrors the create-time default in POST.)
          ...(editValue ? { status: 'active' } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed (${res.status})`);
      }
      setPeers((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {
                ...x,
                credential_valid_until: editValue || null,
                status: editValue ? 'active' : x.status,
              }
            : x
        )
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-critical-100 border border-status-danger-dot px-3 py-2 text-sm text-status-danger-fg">
          {error}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
        <Input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search name, email, specialty, license…"
          className="pl-9"
        />
      </div>

      <BucketCard
        title="Missing credential"
        description="No expiry on file. These peers are blocked from assignment."
        rows={grouped.missing}
        badge={<Badge className="bg-ink-100 text-ink-800 border-0">Missing</Badge>}
        editingId={editingId}
        editValue={editValue}
        savingId={savingId}
        onStartEdit={startEdit}
        onChangeValue={setEditValue}
        onCancel={() => setEditingId(null)}
        onSave={saveEdit}
      />

      <BucketCard
        title="Expired"
        description="Credential expired before today. Blocked from assignment."
        rows={grouped.expired}
        badge={<Badge className="bg-critical-100 text-status-danger-fg border-0">Expired</Badge>}
        editingId={editingId}
        editValue={editValue}
        savingId={savingId}
        onStartEdit={startEdit}
        onChangeValue={setEditValue}
        onCancel={() => setEditingId(null)}
        onSave={saveEdit}
      />

      <BucketCard
        title="Expiring soon (next 60 days)"
        description="Renew before expiry to avoid assignment interruptions."
        rows={grouped.expiring}
        badge={<Badge className="bg-amber-100 text-status-warning-fg border-0">Expiring</Badge>}
        editingId={editingId}
        editValue={editValue}
        savingId={savingId}
        onStartEdit={startEdit}
        onChangeValue={setEditValue}
        onCancel={() => setEditingId(null)}
        onSave={saveEdit}
      />

      <BucketCard
        title="Valid"
        description="Credentials current. Eligible for assignment."
        rows={grouped.valid}
        badge={<Badge className="bg-mint-100 text-status-info-fg border-0">Valid</Badge>}
        editingId={editingId}
        editValue={editValue}
        savingId={savingId}
        onStartEdit={startEdit}
        onChangeValue={setEditValue}
        onCancel={() => setEditingId(null)}
        onSave={saveEdit}
      />
    </div>
  );
}

function BucketCard(props: {
  title: string;
  description: string;
  rows: Peer[];
  badge: React.ReactNode;
  editingId: string | null;
  editValue: string;
  savingId: string | null;
  onStartEdit: (r: Peer) => void;
  onChangeValue: (v: string) => void;
  onCancel: () => void;
  onSave: (r: Peer) => void;
}) {
  const { title, description, rows, badge, editingId, editValue, savingId } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-ink-secondary">({rows.length})</span>
          <span className="ml-auto">{badge}</span>
        </CardTitle>
        <p className="text-xs text-ink-secondary">{description}</p>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-ink-tertiary">None</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border-subtle bg-ink-50 text-xs uppercase tracking-wider text-ink-secondary">
                  <th className="px-4 py-2 text-left">Peer</th>
                  <th className="px-4 py-2 text-left">Specialties</th>
                  <th className="px-4 py-2 text-left">License</th>
                  <th className="px-4 py-2 text-left">Expiry</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isEditing = editingId === r.id;
                  const saving = savingId === r.id;
                  return (
                    <tr key={r.id} className="border-b border-border-subtle hover:bg-ink-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-ink-primary">{r.full_name ?? '—'}</div>
                        <div className="text-xs text-ink-secondary">{r.email ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2 text-ink-secondary">{specialtiesText(r)}</td>
                      <td className="px-4 py-2 text-ink-secondary">
                        {r.license_number
                          ? `${r.license_number}${r.license_state ? ` (${r.license_state})` : ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editValue}
                            onChange={(e) => props.onChangeValue(e.target.value)}
                            className="w-full rounded-md border border-border-default px-2 py-1 text-sm"
                          />
                        ) : r.credential_valid_until ? (
                          <span className="text-ink-primary">
                            {String(r.credential_valid_until).slice(0, 10)}
                          </span>
                        ) : (
                          <span className="text-ink-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={props.onCancel}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => props.onSave(r)} disabled={saving}>
                              {saving ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => props.onStartEdit(r)}>
                            Edit credential
                          </Button>
                        )}
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
  );
}
