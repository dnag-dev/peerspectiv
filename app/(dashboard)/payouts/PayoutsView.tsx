'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  DollarSign,
  CheckCircle2,
  Clock,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
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

type RateType = 'per_minute' | 'per_report' | 'per_hour';
type Status = 'pending' | 'approved' | 'paid';

interface PayoutRow {
  id: string | null;
  peer_id: string;
  reviewer_name: string;
  specialty: string;
  period_start: string;
  period_end: string;
  unit_type: RateType;
  units: number;
  rate_amount: number;
  amount: number;
  status: Status;
  approved_at: string | null;
  paid_at: string | null;
  persisted: boolean;
}

const UNIT_LABEL: Record<RateType, string> = {
  per_minute: 'minutes',
  per_report: 'reports',
  per_hour: 'hours',
};

const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { bg: 'bg-cobalt-100', text: 'text-cobalt-600' },
  paid: { bg: 'bg-mint-100', text: 'text-cobalt-700' },
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthOptions(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type SortKey =
  | 'reviewer_name'
  | 'specialty'
  | 'units'
  | 'rate_amount'
  | 'amount'
  | 'status';
type SortDir = 'asc' | 'desc';

export function PayoutsView() {
  const [month, setMonth] = useState(currentMonth());
  const [monthExplicit, setMonthExplicit] = useState(false);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [smartPeriod, setSmartPeriod] = useState<{
    period_start: string;
    period_end: string;
  } | null>(null);
  const [showApproveAllModal, setShowApproveAllModal] = useState(false);
  const [approveAllBusy, setApproveAllBusy] = useState(false);

  // Filter / sort state
  const [searchQ, setSearchQ] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('reviewer_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payouts?month=${month}`);
      if (!res.ok) throw new Error('Failed');
      const json = (await res.json()) as { data: PayoutRow[] };
      setRows(json.data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  // Smart cutoff: on initial mount (no explicit user pick), fetch the
  // current pay period and align the month dropdown to its end month.
  useEffect(() => {
    if (monthExplicit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/payouts/current-period');
        if (!res.ok) return;
        const j = (await res.json()) as { period_start: string; period_end: string };
        if (cancelled || !j.period_end) return;
        setSmartPeriod(j);
        const ym = j.period_end.slice(0, 7);
        setMonth(ym);
      } catch {
        /* fall back to currentMonth() default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [monthExplicit]);

  async function approveAll() {
    setApproveAllBusy(true);
    try {
      // Use smart period if available, else fall back to the month bounds.
      const [y, m] = month.split('-').map(Number);
      const ms = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
      const me = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      const period_start = smartPeriod?.period_start ?? ms;
      const period_end = smartPeriod?.period_end ?? me;
      const res = await fetch('/api/payouts/approve-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start, period_end }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setShowApproveAllModal(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setApproveAllBusy(false);
    }
  }

  async function approve(r: PayoutRow) {
    setActingId(`approve-${r.peer_id}`);
    try {
      let payoutId = r.id;
      if (!payoutId) {
        // Persist computed pending first
        const ins = await fetch('/api/payouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peer_id: r.peer_id,
            period_start: r.period_start,
            period_end: r.period_end,
          }),
        });
        if (!ins.ok) throw new Error('Create failed');
        const json = (await ins.json()) as { data: { id: string } };
        payoutId = json.data.id;
      }
      const res = await fetch(`/api/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) throw new Error('Approve failed');
      await load();
    } finally {
      setActingId(null);
    }
  }

  async function markPaid(r: PayoutRow) {
    if (!r.id) return;
    setActingId(`pay-${r.id}`);
    try {
      const res = await fetch(`/api/payouts/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (res.ok) await load();
    } finally {
      setActingId(null);
    }
  }

  const totals = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
    const approved = rows.filter((r) => r.status === 'approved').reduce((s, r) => s + r.amount, 0);
    const paid = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
    return { pending, approved, paid };
  }, [rows]);

  const baseRows = rows.filter((r) => r.amount > 0 || r.persisted);

  const specialties = useMemo(() => {
    const s = new Set<string>();
    for (const r of baseRows) if (r.specialty) s.add(r.specialty);
    return Array.from(s).sort();
  }, [baseRows]);

  const filteredRows = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return baseRows.filter((r) => {
      if (specialtyFilter !== 'all' && r.specialty !== specialtyFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.reviewer_name.toLowerCase().includes(q) ||
        (r.specialty ?? '').toLowerCase().includes(q)
      );
    });
  }, [baseRows, specialtyFilter, statusFilter, searchQ]);

  const visibleRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      let av: number | string = '';
      let bv: number | string = '';
      switch (sortKey) {
        case 'reviewer_name':
          av = a.reviewer_name.toLowerCase();
          bv = b.reviewer_name.toLowerCase();
          break;
        case 'specialty':
          av = (a.specialty ?? '').toLowerCase();
          bv = (b.specialty ?? '').toLowerCase();
          break;
        case 'units':
          av = a.units;
          bv = b.units;
          break;
        case 'rate_amount':
          av = a.rate_amount;
          bv = b.rate_amount;
          break;
        case 'amount':
          av = a.amount;
          bv = b.amount;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredRows, sortKey, sortDir]);

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
        className={`px-4 py-3 cursor-pointer select-none hover:text-ink-900 ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`h-3 w-3 ${active ? 'text-cobalt-600' : 'text-ink-300'}`} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period + summary */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-500 mb-1">
            Billing Period
          </label>
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setMonthExplicit(true);
            }}
            className="rounded-md border border-ink-300 px-3 py-2 text-sm bg-white"
          >
            {monthOptions().map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <SummaryPill
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            label="Pending"
            value={totals.pending}
          />
          <SummaryPill
            icon={<CheckCircle2 className="h-4 w-4 text-cobalt-600" />}
            label="Approved"
            value={totals.approved}
          />
          <SummaryPill
            icon={<DollarSign className="h-4 w-4 text-cobalt-600" />}
            label="Paid"
            value={totals.paid}
          />
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search reviewer, specialty…"
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Showing <strong>{visibleRows.length}</strong> of {baseRows.length} payouts
          </p>
        </CardContent>
      </Card>

      {/* Approve-all bar */}
      <div className="flex items-center justify-end">
        {(() => {
          const pendingVisible = visibleRows.filter((r) => r.status === 'pending');
          const pendingCount = pendingVisible.length;
          const pendingTotal = pendingVisible.reduce((s, r) => s + r.amount, 0);
          return (
            <Button
              size="sm"
              onClick={() => setShowApproveAllModal(true)}
              disabled={pendingCount === 0 || approveAllBusy}
            >
              Approve all pending ({pendingCount})
            </Button>
          );
        })()}
      </div>

      {showApproveAllModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !approveAllBusy && setShowApproveAllModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-ink-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-ink-900">Approve all pending</h2>
            {(() => {
              const pendingVisible = visibleRows.filter((r) => r.status === 'pending');
              const count = pendingVisible.length;
              const total = pendingVisible.reduce((s, r) => s + r.amount, 0);
              return (
                <p className="mt-2 text-sm text-ink-600">
                  Approve {count} payout{count === 1 ? '' : 's'} totaling{' '}
                  <strong>${total.toFixed(2)}</strong>?
                </p>
              );
            })()}
            <p className="mt-2 text-xs text-ink-500">
              Window: {smartPeriod?.period_start ?? '—'} → {smartPeriod?.period_end ?? '—'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowApproveAllModal(false)}
                disabled={approveAllBusy}
              >
                Cancel
              </Button>
              <Button onClick={approveAll} disabled={approveAllBusy}>
                {approveAllBusy ? 'Approving…' : 'Approve all'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <SortHead label="Reviewer" k="reviewer_name" />
              <SortHead label="Specialty" k="specialty" />
              <SortHead label="Units" k="units" />
              <SortHead label="Rate" k="rate_amount" />
              <SortHead label="Amount" k="amount" align="right" />
              <SortHead label="Status" k="status" />
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-cobalt-600 inline" />
                </td>
              </tr>
            )}
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                  No payouts for this period.
                </td>
              </tr>
            )}
            {!loading &&
              visibleRows.map((r) => {
                const colors = STATUS_COLORS[r.status];
                const approveKey = `approve-${r.peer_id}`;
                const payKey = `pay-${r.id}`;
                return (
                  <tr
                    key={r.id ?? r.peer_id}
                    className="border-b border-ink-100 hover:bg-ink-50"
                  >
                    <td className="px-4 py-3 font-medium text-ink-900">{r.reviewer_name}</td>
                    <td className="px-4 py-3 text-ink-600">{r.specialty}</td>
                    <td className="px-4 py-3 text-ink-700">
                      {r.units.toLocaleString()} {UNIT_LABEL[r.unit_type]}
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      ${r.rate_amount.toFixed(2)}
                      <span className="text-ink-400">/{r.unit_type.replace('per_', '')}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink-900">
                      ${r.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${colors.bg} ${colors.text} border-0`}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {r.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => approve(r)}
                            disabled={actingId === approveKey || r.amount <= 0}
                          >
                            {actingId === approveKey ? 'Approving...' : 'Approve'}
                          </Button>
                        )}
                        {r.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaid(r)}
                            disabled={actingId === payKey}
                          >
                            {actingId === payKey ? 'Saving...' : 'Mark Paid'}
                          </Button>
                        )}
                        {r.status === 'paid' && r.paid_at && (
                          <span className="text-xs text-ink-500">
                            Paid {new Date(r.paid_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-ink-200 bg-white px-4 py-2 min-w-[130px]">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-500">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-ink-900">
        ${value.toFixed(2)}
      </div>
    </div>
  );
}
