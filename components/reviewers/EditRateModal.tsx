'use client';

// Despite the filename this is the full reviewer editor (name, email,
// specialty, board cert, rate). Kept the file name to avoid a rename churn
// across the codebase — the export is also aliased as `EditReviewerModal`.

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type RateType = 'per_minute' | 'per_report' | 'per_hour';

interface Reviewer {
  id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  rate_type: string | null;
  rate_amount: string | number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  reviewer: Reviewer;
  // Kept for back-compat with any caller still passing these explicitly —
  // they override the values pulled from `reviewer`.
  reviewerId?: string;
  reviewerName?: string;
  currentRateType?: RateType;
  currentRateAmount?: number;
  boardCertification?: string | null;
  onSuccess: (updated: {
    full_name: string;
    email: string;
    specialty: string;
    board_certification: string | null;
    rate_type: RateType;
    rate_amount: number;
  }) => void;
}

const SPECIALTIES = [
  'Family Medicine',
  'Internal Medicine',
  'Pediatrics',
  'OB/GYN',
  'Behavioral Health',
  'Dental',
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Other',
];

const RATE_TYPES = [
  { value: 'per_minute' as const, label: 'Per minute', suffix: '$/min' },
  { value: 'per_report' as const, label: 'Per report', suffix: '$/report' },
  { value: 'per_hour' as const, label: 'Per hour', suffix: '$/hour' },
];

export function EditRateModal({
  open,
  onClose,
  reviewer,
  boardCertification,
  currentRateType,
  currentRateAmount,
  onSuccess,
}: Props) {
  const id = reviewer.id;
  const [fullName, setFullName] = useState(reviewer.full_name ?? '');
  const [email, setEmail] = useState(reviewer.email ?? '');
  const [specialty, setSpecialty] = useState(reviewer.specialty ?? SPECIALTIES[0]);
  const [boardCert, setBoardCert] = useState(boardCertification ?? '');
  const [rateType, setRateType] = useState<RateType>(
    (currentRateType ?? (reviewer.rate_type as RateType)) ?? 'per_minute'
  );
  const [rateAmount, setRateAmount] = useState(
    String(currentRateAmount ?? Number(reviewer.rate_amount ?? 1))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields whenever the modal is (re)opened for a different reviewer.
  useEffect(() => {
    if (!open) return;
    setFullName(reviewer.full_name ?? '');
    setEmail(reviewer.email ?? '');
    setSpecialty(reviewer.specialty ?? SPECIALTIES[0]);
    setBoardCert(boardCertification ?? '');
    setRateType(((currentRateType ?? (reviewer.rate_type as RateType)) ?? 'per_minute'));
    setRateAmount(String(currentRateAmount ?? Number(reviewer.rate_amount ?? 1)));
    setError(null);
  }, [open, reviewer, boardCertification, currentRateType, currentRateAmount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ra = Number(rateAmount);
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        specialty,
        board_certification: boardCert.trim() || null,
        rate_type: rateType,
        rate_amount: ra,
      };
      const res = await fetch(`/api/reviewers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      onSuccess(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reviewer');
    } finally {
      setSubmitting(false);
    }
  }

  const suffix = RATE_TYPES.find((r) => r.value === rateType)!.suffix;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Reviewer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialty <span className="text-red-500">*</span>
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Board Certification
            </label>
            <input
              type="text"
              value={boardCert}
              onChange={(e) => setBoardCert(e.target.value)}
              placeholder="e.g. ABFM, ABIM"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-900 mb-3">Compensation</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rate Type
                </label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as RateType)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {RATE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount ({suffix})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                  required
                />
              </div>
            </div>
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
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Alias so callers can import under the clearer name.
export { EditRateModal as EditReviewerModal };
