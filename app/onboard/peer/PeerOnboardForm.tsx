'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const SPECIALTIES = [
  'Family Medicine',
  'Internal Medicine',
  'Pediatrics',
  'OB/GYN',
  'Behavioral Health',
  'Dental',
];

export function PeerOnboardForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [boardCert, setBoardCert] = useState('');
  const [npi, setNpi] = useState('');
  const [maxCaseLoad, setMaxCaseLoad] = useState('75');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(s: string) {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (specialties.length === 0) {
      setError('Select at least one specialty');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboard/peer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          specialties,
          license_number: licenseNumber,
          license_state: licenseState,
          board_certification: boardCert || null,
          npi: npi || null,
          max_case_load: Number(maxCaseLoad) || 75,
          reference: reference || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed (${res.status})`);
      }
      router.push('/onboard/peer/thanks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-primary mb-1">
          Full Name <span className="text-status-danger-dot">*</span>
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-primary mb-1">
          Email <span className="text-status-danger-dot">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-primary mb-2">
          Specialties <span className="text-status-danger-dot">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SPECIALTIES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-ink-primary">
              <input
                type="checkbox"
                checked={specialties.includes(s)}
                onChange={() => toggle(s)}
                className="rounded border-border-default"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1">
            License Number <span className="text-status-danger-dot">*</span>
          </label>
          <input
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
            className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1">
            License State <span className="text-status-danger-dot">*</span>
          </label>
          <input
            type="text"
            value={licenseState}
            onChange={(e) => setLicenseState(e.target.value)}
            maxLength={2}
            required
            className="w-full rounded-md border border-border-default px-3 py-2 text-sm uppercase"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-primary mb-1">
          Board Certification
        </label>
        <input
          type="text"
          value={boardCert}
          onChange={(e) => setBoardCert(e.target.value)}
          placeholder="e.g. ABFM, ABIM"
          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1">NPI (optional)</label>
          <input
            type="text"
            value={npi}
            onChange={(e) => setNpi(e.target.value)}
            className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-primary mb-1">
            Max Case Load Preference
          </label>
          <input
            type="number"
            min="1"
            value={maxCaseLoad}
            onChange={(e) => setMaxCaseLoad(e.target.value)}
            className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-primary mb-1">
          Reference (name, email, relationship)
        </label>
        <textarea
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-md bg-critical-100 border border-status-danger-dot px-3 py-2 text-sm text-status-danger-fg">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </Button>
      </div>
    </form>
  );
}
