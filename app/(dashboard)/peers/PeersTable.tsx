'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SetUnavailableModal } from '@/components/peers/SetUnavailableModal';
import { AddPeerModal } from '@/components/peers/AddPeerModal';
import { EditRateModal } from '@/components/peers/EditRateModal';

type RateType = 'per_minute' | 'per_report' | 'per_hour';

interface Peer {
  id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  specialties: string[] | null;
  board_certification: string | null;
  active_cases_count: number | null;
  total_reviews_completed: number | null;
  availability_status: string | null;
  status: string | null;
  rate_type: string | null;
  rate_amount: string | number | null;
  license_number: string | null;
  license_state: string | null;
  credential_valid_until: string | null;
  max_case_load: number | null;
}

function specialtiesAsList(r: Peer): string[] {
  if (Array.isArray(r.specialties) && r.specialties.length > 0) {
    return r.specialties;
  }
  return r.specialty ? [r.specialty] : [];
}

function daysToExpiry(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / 86_400_000
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  available: { bg: 'bg-mint-100', text: 'text-status-info-fg' },
  vacation: { bg: 'bg-critical-100', text: 'text-status-danger-fg' },
  on_leave: { bg: 'bg-amber-100', text: 'text-status-warning-fg' },
  inactive: { bg: 'bg-ink-100', text: 'text-ink-800' },
};

const RATE_SUFFIX: Record<RateType, string> = {
  per_minute: '/min',
  per_report: '/report',
  per_hour: '/hr',
};

function formatRate(type: string | null, amount: string | number | null): string {
  const rt = (type ?? 'per_minute') as RateType;
  const amt = amount == null ? 0 : Number(amount);
  if (!Number.isFinite(amt)) return '—';
  return `$${amt.toFixed(2)}${RATE_SUFFIX[rt] ?? ''}`;
}

type SortKey =
  | 'full_name'
  | 'specialty'
  | 'active_cases_count'
  | 'total_reviews_completed'
  | 'rate_amount'
  | 'availability_status';
type SortDir = 'asc' | 'desc';

export function PeersTable({ peers: initial }: { peers: Peer[] }) {
  const router = useRouter();
  const [peers, setPeers] = useState(initial);
  const [unavailOpen, setUnavailOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Peer | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [availFilter, setAvailFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const specialties = useMemo(() => {
    const s = new Set<string>();
    for (const r of peers) {
      if (Array.isArray(r.specialties) && r.specialties.length > 0) {
        for (const sp of r.specialties) s.add(sp);
      } else if (r.specialty) {
        s.add(r.specialty);
      }
    }
    return Array.from(s).sort();
  }, [peers]);

  const availabilities = useMemo(() => {
    const s = new Set<string>();
    for (const r of peers) {
      const a = r.availability_status || 'available';
      s.add(a);
    }
    return Array.from(s).sort();
  }, [peers]);

  const states = useMemo(() => {
    const s = new Set<string>();
    for (const r of peers) {
      if (r.license_state) s.add(r.license_state);
    }
    return Array.from(s).sort();
  }, [peers]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return peers.filter((r) => {
      if (specialtyFilter !== 'all') {
        const specs = specialtiesAsList(r);
        // SA-104 — multi-include semantics: row matches when any selected
        // specialty is in the peer's list. Single-select for now; the
        // dropdown just exposes one value.
        if (!specs.includes(specialtyFilter)) return false;
      }
      const status = r.availability_status || 'available';
      if (availFilter !== 'all' && status !== availFilter) return false;
      if (stateFilter !== 'all' && r.license_state !== stateFilter) return false;
      if (!q) return true;
      const specHaystack = specialtiesAsList(r).join(' ').toLowerCase();
      return (
        (r.full_name ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        specHaystack.includes(q)
      );
    });
  }, [peers, specialtyFilter, availFilter, stateFilter, searchQ]);

  const visible = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: number | string = '';
      let bv: number | string = '';
      switch (sortKey) {
        case 'full_name':
          av = (a.full_name ?? '').toLowerCase();
          bv = (b.full_name ?? '').toLowerCase();
          break;
        case 'specialty':
          av = (a.specialty ?? '').toLowerCase();
          bv = (b.specialty ?? '').toLowerCase();
          break;
        case 'active_cases_count':
          av = a.active_cases_count ?? 0;
          bv = b.active_cases_count ?? 0;
          break;
        case 'total_reviews_completed':
          av = a.total_reviews_completed ?? 0;
          bv = b.total_reviews_completed ?? 0;
          break;
        case 'rate_amount':
          av = a.rate_amount == null ? 0 : Number(a.rate_amount);
          bv = b.rate_amount == null ? 0 : Number(b.rate_amount);
          break;
        case 'availability_status':
          av = a.availability_status || 'available';
          bv = b.availability_status || 'available';
          break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(k);
      setSortDir('asc');
    }
  }

  function SortHead({
    label,
    k,
    align = 'left',
  }: {
    label: string;
    k: SortKey;
    align?: 'left' | 'right';
  }) {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th
        onClick={() => toggleSort(k)}
        className={`px-4 py-3 cursor-pointer select-none hover:text-ink-primary ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`h-3 w-3 ${active ? 'text-status-info-dot' : 'text-ink-tertiary'}`} />
        </span>
      </th>
    );
  }

  function openUnavail(r: Peer) {
    setSelected(r);
    setUnavailOpen(true);
  }
  function openEdit(r: Peer) {
    setSelected(r);
    setRateOpen(true);
  }

  async function markAvailable(r: Peer) {
    const res = await fetch(`/api/peers/${r.id}/availability`, { method: 'POST' });
    if (res.ok) {
      setPeers((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, availability_status: 'available' } : x))
      );
    }
  }

  function handleUnavailSuccess(peerId: string, status: string) {
    setPeers((prev) =>
      prev.map((x) => (x.id === peerId ? { ...x, availability_status: status } : x))
    );
    setUnavailOpen(false);
  }

  function handleEditSuccess(updated: {
    full_name: string;
    email: string;
    specialty: string;
    specialties: string[];
    board_certification: string | null;
    license_number: string | null;
    license_state: string | null;
    credential_valid_until: string | null;
    max_case_load: number;
    rate_type: RateType;
    rate_amount: number;
  }) {
    if (!selected) return;
    setPeers((prev) =>
      prev.map((x) =>
        x.id === selected.id
          ? {
              ...x,
              full_name: updated.full_name,
              email: updated.email,
              specialty: updated.specialty,
              specialties: updated.specialties,
              board_certification: updated.board_certification,
              license_number: updated.license_number,
              license_state: updated.license_state,
              credential_valid_until: updated.credential_valid_until,
              max_case_load: updated.max_case_load,
              rate_type: updated.rate_type,
              rate_amount: updated.rate_amount,
            }
          : x
      )
    );
    setRateOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-secondary">
          {peers.length} peer{peers.length === 1 ? '' : 's'}
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Peer
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_140px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search name, specialty…"
                className="pl-9"
              />
            </div>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availFilter} onValueChange={setAvailFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any availability</SelectItem>
                {availabilities.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any state</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-ink-secondary">
            Showing <strong>{visible.length}</strong> of {peers.length} peers
          </p>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-ink-50 text-xs uppercase tracking-wider text-ink-secondary">
              <SortHead label="Name" k="full_name" />
              <th className="px-4 py-3 text-left">Email</th>
              <SortHead label="Specialties" k="specialty" />
              <th className="px-4 py-3 text-left">License</th>
              <th className="px-4 py-3 text-left">State</th>
              <SortHead label="Active" k="active_cases_count" />
              <SortHead label="Total" k="total_reviews_completed" />
              <SortHead label="Availability" k="availability_status" />
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-ink-tertiary">
                  {peers.length === 0 ? 'No peers found.' : 'No peers match your filters.'}
                </td>
              </tr>
            )}
            {visible.map((r) => {
              const status = r.availability_status || 'available';
              const colors = STATUS_COLORS[status] || STATUS_COLORS.inactive;
              const specs = specialtiesAsList(r);
              const expDays = daysToExpiry(r.credential_valid_until);
              const expWarn = expDays != null && expDays < 60;
              return (
                <tr key={r.id} className="border-b border-border-subtle hover:bg-ink-50">
                  <td className="px-4 py-3 font-medium text-ink-primary">
                    <Link
                      href={`/peers/${r.id}`}
                      className="hover:text-brand-navy hover:underline"
                    >
                      {r.full_name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary text-xs">{r.email ?? '—'}</td>
                  <td className="px-4 py-3" data-testid="peers-row-specialties">
                    <div className="flex flex-wrap gap-1">
                      {specs.length === 0 && (
                        <span className="text-xs text-ink-tertiary">—</span>
                      )}
                      {specs.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="bg-status-info-bg text-status-info-fg text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary text-xs">
                    <div className="font-mono">{r.license_number ?? '—'}</div>
                    {r.credential_valid_until && (
                      <div
                        className={
                          expWarn ? 'text-status-danger-fg font-medium' : 'text-ink-tertiary'
                        }
                      >
                        {expDays! < 0
                          ? `Expired ${Math.abs(expDays!)}d ago`
                          : expWarn
                            ? `Expires ${expDays}d`
                            : `Valid through ${new Date(r.credential_valid_until).toLocaleDateString()}`}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{r.license_state ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-secondary">{r.active_cases_count ?? 0}</td>
                  <td className="px-4 py-3 text-ink-secondary">{r.total_reviews_completed ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${colors.bg} ${colors.text} border-0`}>
                      {status.replace('_', ' ')}
                    </Badge>
                    <div className="mt-1 text-[10px] text-ink-secondary">
                      {formatRate(r.rate_type, r.rate_amount)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                        Edit
                      </Button>
                      {status === 'available' ? (
                        <Button variant="outline" size="sm" onClick={() => openUnavail(r)}>
                          Set Unavailable
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => markAvailable(r)}>
                          Mark Available
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AddPeerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          // refresh server data to include the new peer
          router.refresh();
        }}
      />

      {selected && (
        <SetUnavailableModal
          open={unavailOpen}
          onClose={() => setUnavailOpen(false)}
          peerId={selected.id}
          peerName={selected.full_name ?? 'Peer'}
          onSuccess={(status) => handleUnavailSuccess(selected.id, status)}
        />
      )}

      {selected && (
        <EditRateModal
          open={rateOpen}
          onClose={() => setRateOpen(false)}
          peer={selected}
          boardCertification={selected.board_certification}
          currentRateType={(selected.rate_type as RateType) ?? 'per_minute'}
          currentRateAmount={Number(selected.rate_amount ?? 1)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
