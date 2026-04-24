'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type RateType = 'per_minute' | 'per_report' | 'per_hour';

interface Props {
  open: boolean;
  onClose: () => void;
  reviewerId: string;
  reviewerName: string;
  currentRateType: RateType;
  currentRateAmount: number;
  onSuccess: (rateType: RateType, rateAmount: number) => void;
}

const RATE_TYPES = [
  { value: 'per_minute' as const, label: 'Per minute', suffix: '$/min' },
  { value: 'per_report' as const, label: 'Per report', suffix: '$/report' },
  { value: 'per_hour' as const, label: 'Per hour', suffix: '$/hour' },
];

export function EditRateModal({
  open,
  onClose,
  reviewerId,
  reviewerName,
  currentRateType,
  currentRateAmount,
  onSuccess,
}: Props) {
  const [rateType, setRateType] = useState<RateType>(currentRateType);
  const [rateAmount, setRateAmount] = useState(String(currentRateAmount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ra = Number(rateAmount);
      const res = await fetch(`/api/reviewers/${reviewerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate_type: rateType, rate_amount: ra }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      onSuccess(rateType, ra);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate');
    } finally {
      setSubmitting(false);
    }
  }

  const suffix = RATE_TYPES.find((r) => r.value === rateType)!.suffix;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Rate — {reviewerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Type
            </label>
            <select
              value={rateType}
              onChange={(e) => setRateType(e.target.value as RateType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {RATE_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ({suffix})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rateAmount}
              onChange={(e) => setRateAmount(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
