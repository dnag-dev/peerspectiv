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
];

const RATE_TYPES = [
  { value: 'per_minute', label: 'Per minute', placeholder: '1.00', suffix: '$/min' },
  { value: 'per_report', label: 'Per report', placeholder: '75.00', suffix: '$/report' },
  { value: 'per_hour', label: 'Per hour', placeholder: '60.00', suffix: '$/hour' },
] as const;

export function AddPeerModal({ open, onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([SPECIALTIES[0]]);
  const [boardCert, setBoardCert] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [credentialValidUntil, setCredentialValidUntil] = useState('');
  const [maxCaseLoad, setMaxCaseLoad] = useState('75');
  const [rateType, setRateType] = useState<'per_minute' | 'per_report' | 'per_hour'>('per_minute');
  const [rateAmount, setRateAmount] = useState('1.00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFullName('');
    setEmail('');
    setSpecialties([SPECIALTIES[0]]);
    setBoardCert('');
    setLicenseNumber('');
    setLicenseState('');
    setCredentialValidUntil('');
    setMaxCaseLoad('75');
    setRateType('per_minute');
    setRateAmount('1.00');
    setError(null);
  }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (specialties.length === 0) {
      setError('Select at least one specialty');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/peers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          specialties,
          board_certification: boardCert || null,
          license_number: licenseNumber || null,
          license_state: licenseState || null,
          credential_valid_until: credentialValidUntil || null,
          max_case_load: Number(maxCaseLoad) || 75,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Reviewer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Full Name <span className="text-critical-600">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Email <span className="text-critical-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              Specialties <span className="text-critical-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTIES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={specialties.includes(s)}
                    onChange={() => toggleSpecialty(s)}
                    className="rounded border-ink-300"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Board Certification
            </label>
            <input
              type="text"
              value={boardCert}
              onChange={(e) => setBoardCert(e.target.value)}
              placeholder="e.g. ABFM, ABIM"
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                License Number
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                License State
              </label>
              <input
                type="text"
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                placeholder="e.g. CA"
                maxLength={2}
                className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Credential Valid Until
              </label>
              <input
                type="date"
                value={credentialValidUntil}
                onChange={(e) => setCredentialValidUntil(e.target.value)}
                className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-ink-500">
                Leave blank to keep reviewer inactive until set.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Max Case Load
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxCaseLoad}
                onChange={(e) => setMaxCaseLoad(e.target.value)}
                className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-md border border-ink-200 bg-ink-50 p-3 space-y-3">
            <div className="text-sm font-medium text-ink-700">Compensation</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-ink-600 mb-1">Rate Type</label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as typeof rateType)}
                  className="w-full rounded-md border border-ink-300 px-2 py-1.5 text-sm bg-white"
                >
                  {RATE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink-600 mb-1">
                  Amount ({currentRate.suffix})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  placeholder={currentRate.placeholder}
                  className="w-full rounded-md border border-ink-300 px-2 py-1.5 text-sm bg-white"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-ink-500">
              Default is per-minute billing. Change anytime in the Actions column.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-critical-100 border border-critical-600 px-3 py-2 text-sm text-critical-700">
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
