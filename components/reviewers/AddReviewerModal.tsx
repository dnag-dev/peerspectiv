'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  { value: 'per_minute', label: 'Per minute', placeholder: '1.00', suffix: '$/min' },
  { value: 'per_report', label: 'Per report', placeholder: '75.00', suffix: '$/report' },
  { value: 'per_hour', label: 'Per hour', placeholder: '60.00', suffix: '$/hour' },
] as const;

export function AddReviewerModal({ open, onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [boardCert, setBoardCert] = useState('');
  const [rateType, setRateType] = useState<'per_minute' | 'per_report' | 'per_hour'>('per_minute');
  const [rateAmount, setRateAmount] = useState('1.00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFullName('');
    setEmail('');
    setSpecialty(SPECIALTIES[0]);
    setBoardCert('');
    setRateType('per_minute');
    setRateAmount('1.00');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviewers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          specialty,
          board_certification: boardCert || null,
          rate_type: rateType,
          rate_amount: Number(rateAmount),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reviewer');
    } finally {
      setSubmitting(false);
    }
  }

  const currentRate = RATE_TYPES.find((r) => r.value === rateType)!;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Reviewer</DialogTitle>
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

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3">
            <div className="text-sm font-medium text-gray-700">Compensation</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Rate Type</label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as typeof rateType)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white"
                >
                  {RATE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Amount ({currentRate.suffix})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  placeholder={currentRate.placeholder}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Default is per-minute billing. Change anytime in the Actions column.
            </p>
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
              {submitting ? 'Adding...' : 'Add Reviewer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
