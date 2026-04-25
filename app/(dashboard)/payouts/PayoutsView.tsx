'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type RateType = 'per_minute' | 'per_report' | 'per_hour';
type Status = 'pending' | 'approved' | 'paid';

interface PayoutRow {
  id: string | null;
  reviewer_id: string;
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
  pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-800' },
  paid: { bg: 'bg-green-100', text: 'text-green-800' },
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

export function PayoutsView() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

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

  async function approve(r: PayoutRow) {
    setActingId(`approve-${r.reviewer_id}`);
    try {
      let payoutId = r.id;
      if (!payoutId) {
        // Persist computed pending first
        const ins = await fetch('/api/payouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewer_id: r.reviewer_id,
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

  const visibleRows = rows.filter((r) => r.amount > 0 || r.persisted);

  return (
    <div className="space-y-6">
      {/* Period + summary */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
            Billing Period
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
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
            icon={<CheckCircle2 className="h-4 w-4 text-mint-600" />}
            label="Approved"
            value={totals.approved}
          />
          <SummaryPill
            icon={<DollarSign className="h-4 w-4 text-green-600" />}
            label="Paid"
            value={totals.paid}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-mint-600 inline" />
                </td>
              </tr>
            )}
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No payouts for this period.
                </td>
              </tr>
            )}
            {!loading &&
              visibleRows.map((r) => {
                const colors = STATUS_COLORS[r.status];
                const approveKey = `approve-${r.reviewer_id}`;
                const payKey = `pay-${r.id}`;
                return (
                  <tr
                    key={r.id ?? r.reviewer_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{r.reviewer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.specialty}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.units.toLocaleString()} {UNIT_LABEL[r.unit_type]}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      ${r.rate_amount.toFixed(2)}
                      <span className="text-gray-400">/{r.unit_type.replace('per_', '')}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
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
                          <span className="text-xs text-gray-500">
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
    <div className="rounded-md border border-gray-200 bg-white px-4 py-2 min-w-[130px]">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-gray-900">
        ${value.toFixed(2)}
      </div>
    </div>
  );
}
