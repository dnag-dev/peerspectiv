'use client';

// Despite the filename this is the full peer editor (name, email,
// specialties, board cert, license, credential expiry, caseload, rate).
// Kept the file name to avoid a rename churn across the codebase — the
// export is also aliased as `EditPeerModal`.

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SpecialtyMultiSelect } from '@/components/peers/SpecialtyMultiSelect';

type RateType = 'per_minute' | 'per_report' | 'per_hour';

interface Peer {
  id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  specialties?: string[] | null;
  rate_type: string | null;
  rate_amount: string | number | null;
  license_number?: string | null;
  license_state?: string | null;
  credential_valid_until?: string | null;
  max_case_load?: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  peer: Peer;
  // Kept for back-compat with any caller still passing these explicitly —
  // they override the values pulled from `peer`.
  peerId?: string;
  peerName?: string;
  currentRateType?: RateType;
  currentRateAmount?: number;
  boardCertification?: string | null;
  onSuccess: (updated: {
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
  }) => void;
}

// Specialty list moved to /api/specialties (Phase 2 multi-spec UI).
// Fallback default kept for `initialSpecialties` when a peer has none yet.
const FALLBACK_SPECIALTY = 'Family Medicine';

const RATE_TYPES = [
  { value: 'per_minute' as const, label: 'Per minute', suffix: '$/min' },
  { value: 'per_report' as const, label: 'Per report', suffix: '$/report' },
  { value: 'per_hour' as const, label: 'Per hour', suffix: '$/hour' },
];

function initialSpecialties(r: Peer): string[] {
  if (Array.isArray(r.specialties) && r.specialties.length > 0) {
    return r.specialties;
  }
  if (r.specialty) return [r.specialty];
  return [FALLBACK_SPECIALTY];
}

export function EditRateModal({
  open,
  onClose,
  peer,
  boardCertification,
  currentRateType,
  currentRateAmount,
  onSuccess,
}: Props) {
  const id = peer.id;
  const [fullName, setFullName] = useState(peer.full_name ?? '');
  const [email, setEmail] = useState(peer.email ?? '');
  const [specialties, setSpecialties] = useState<string[]>(initialSpecialties(peer));
  const [boardCert, setBoardCert] = useState(boardCertification ?? '');
  const [licenseNumber, setLicenseNumber] = useState(peer.license_number ?? '');
  const [licenseState, setLicenseState] = useState(peer.license_state ?? '');
  const [credentialValidUntil, setCredentialValidUntil] = useState(
    peer.credential_valid_until ? String(peer.credential_valid_until).slice(0, 10) : ''
  );
  const [maxCaseLoad, setMaxCaseLoad] = useState(String(peer.max_case_load ?? 75));
  const [rateType, setRateType] = useState<RateType>(
    (currentRateType ?? (peer.rate_type as RateType)) ?? 'per_minute'
  );
  const [rateAmount, setRateAmount] = useState(
    String(currentRateAmount ?? Number(peer.rate_amount ?? 1))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields whenever the modal is (re)opened for a different peer.
  useEffect(() => {
    if (!open) return;
    setFullName(peer.full_name ?? '');
    setEmail(peer.email ?? '');
    setSpecialties(initialSpecialties(peer));
    setBoardCert(boardCertification ?? '');
    setLicenseNumber(peer.license_number ?? '');
    setLicenseState(peer.license_state ?? '');
    setCredentialValidUntil(
      peer.credential_valid_until
        ? String(peer.credential_valid_until).slice(0, 10)
        : ''
    );
    setMaxCaseLoad(String(peer.max_case_load ?? 75));
    setRateType(((currentRateType ?? (peer.rate_type as RateType)) ?? 'per_minute'));
    setRateAmount(String(currentRateAmount ?? Number(peer.rate_amount ?? 1)));
    setError(null);
  }, [open, peer, boardCertification, currentRateType, currentRateAmount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (specialties.length === 0) {
      setError('Select at least one specialty');
      return;
    }
    setSubmitting(true);
    try {
      const ra = Number(rateAmount);
      const mcl = Math.max(1, Number(maxCaseLoad) || 75);
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        specialty: specialties[0],
        specialties,
        board_certification: boardCert.trim() || null,
        license_number: licenseNumber.trim() || null,
        license_state: licenseState.trim() || null,
        credential_valid_until: credentialValidUntil || null,
        max_case_load: mcl,
        rate_type: rateType,
        rate_amount: ra,
      };
      const res = await fetch(`/api/peers/${id}`, {
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
      setError(err instanceof Error ? err.message : 'Failed to update peer');
    } finally {
      setSubmitting(false);
    }
  }

  const suffix = RATE_TYPES.find((r) => r.value === rateType)!.suffix;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Peer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              Full Name <span className="text-status-danger-dot">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
              required
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
              className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-primary mb-2" htmlFor="edit-peer-specialties">
              Specialties <span className="text-status-danger-dot">*</span>
            </label>
            <SpecialtyMultiSelect
              id="edit-peer-specialties"
              value={specialties}
              onChange={setSpecialties}
            />
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
              <label className="block text-sm font-medium text-ink-primary mb-1">
                License Number
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1">
                License State
              </label>
              <input
                type="text"
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                maxLength={2}
                className="w-full rounded-md border border-border-default px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1">
                Credential Valid Until
              </label>
              <input
                type="date"
                value={credentialValidUntil}
                onChange={(e) => setCredentialValidUntil(e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1">
                Max Case Load
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxCaseLoad}
                onChange={(e) => setMaxCaseLoad(e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-md border border-border-subtle bg-ink-50 p-3">
            <p className="text-sm font-medium text-ink-primary mb-3">Compensation</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">
                  Rate Type
                </label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as RateType)}
                  className="w-full rounded-md border border-border-default px-3 py-2 text-sm bg-white"
                >
                  {RATE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">
                  Amount ({suffix})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  className="w-full rounded-md border border-border-default px-3 py-2 text-sm bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-critical-100 border border-status-danger-dot px-3 py-2 text-sm text-status-danger-fg">
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
export { EditRateModal as EditPeerModal };
