'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SetUnavailableModal } from '@/components/reviewers/SetUnavailableModal';
import { AddReviewerModal } from '@/components/reviewers/AddReviewerModal';
import { EditRateModal } from '@/components/reviewers/EditRateModal';

type RateType = 'per_minute' | 'per_report' | 'per_hour';

interface Reviewer {
  id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  active_cases_count: number | null;
  total_reviews_completed: number | null;
  availability_status: string | null;
  status: string | null;
  rate_type: string | null;
  rate_amount: string | number | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-800' },
  vacation: { bg: 'bg-red-100', text: 'text-red-800' },
  on_leave: { bg: 'bg-amber-100', text: 'text-amber-800' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
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

export function ReviewersTable({ reviewers: initial }: { reviewers: Reviewer[] }) {
  const router = useRouter();
  const [reviewers, setReviewers] = useState(initial);
  const [unavailOpen, setUnavailOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Reviewer | null>(null);

  function openUnavail(r: Reviewer) {
    setSelected(r);
    setUnavailOpen(true);
  }
  function openRate(r: Reviewer) {
    setSelected(r);
    setRateOpen(true);
  }

  async function markAvailable(r: Reviewer) {
    const res = await fetch(`/api/reviewers/${r.id}/availability`, { method: 'POST' });
    if (res.ok) {
      setReviewers((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, availability_status: 'available' } : x))
      );
    }
  }

  function handleUnavailSuccess(reviewerId: string, status: string) {
    setReviewers((prev) =>
      prev.map((x) => (x.id === reviewerId ? { ...x, availability_status: status } : x))
    );
    setUnavailOpen(false);
  }

  function handleRateSuccess(rateType: RateType, rateAmount: number) {
    if (!selected) return;
    setReviewers((prev) =>
      prev.map((x) =>
        x.id === selected.id ? { ...x, rate_type: rateType, rate_amount: rateAmount } : x
      )
    );
    setRateOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {reviewers.length} reviewer{reviewers.length === 1 ? '' : 's'}
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Reviewer
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviewers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No reviewers found.
                </td>
              </tr>
            )}
            {reviewers.map((r) => {
              const status = r.availability_status || 'available';
              const colors = STATUS_COLORS[status] || STATUS_COLORS.inactive;
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link
                      href={`/reviewers/${r.id}`}
                      className="hover:text-brand-navy hover:underline"
                    >
                      {r.full_name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.specialty ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.active_cases_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{r.total_reviews_completed ?? 0}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="font-medium">{formatRate(r.rate_type, r.rate_amount)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${colors.bg} ${colors.text} border-0`}>
                      {status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openRate(r)}>
                        Edit Rate
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

      <AddReviewerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          // refresh server data to include the new reviewer
          router.refresh();
        }}
      />

      {selected && (
        <SetUnavailableModal
          open={unavailOpen}
          onClose={() => setUnavailOpen(false)}
          reviewerId={selected.id}
          reviewerName={selected.full_name ?? 'Reviewer'}
          onSuccess={(status) => handleUnavailSuccess(selected.id, status)}
        />
      )}

      {selected && (
        <EditRateModal
          open={rateOpen}
          onClose={() => setRateOpen(false)}
          reviewerId={selected.id}
          reviewerName={selected.full_name ?? 'Reviewer'}
          currentRateType={(selected.rate_type as RateType) ?? 'per_minute'}
          currentRateAmount={Number(selected.rate_amount ?? 1)}
          onSuccess={handleRateSuccess}
        />
      )}
    </>
  );
}
