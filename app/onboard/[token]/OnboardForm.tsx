'use client';

import { useState } from 'react';

interface Props {
  token: string;
  email: string;
  specialties: string[];
}

export function OnboardForm({ token, email, specialties }: Props) {
  const [fullName, setFullName] = useState('');
  const [npi, setNpi] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [licenseIssue, setLicenseIssue] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [boardCert, setBoardCert] = useState('');
  const [licenseDocUrl, setLicenseDocUrl] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function togglePick(s: string) {
    setPicked((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (picked.length === 0) {
      setError('Pick at least one specialty.');
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/onboard/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        npi,
        license_number: licenseNumber,
        license_state: licenseState,
        license_issue: licenseIssue || null,
        license_expiry: licenseExpiry,
        board_certification: boardCert || null,
        license_document_url: licenseDocUrl || null,
        specialties: picked,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Submission failed');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6 rounded border border-mint-200 bg-mint-50 p-4 text-mint-800">
        Submitted — thank you. The team will review your application shortly.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 text-sm">
      <label className="block">
        <div className="text-xs font-medium text-ink-700">Full name</div>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
               className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
      </label>

      <label className="block">
        <div className="text-xs font-medium text-ink-700">Email (locked)</div>
        <input value={email} disabled
               className="mt-1 w-full rounded border border-ink-200 bg-ink-50 px-3 py-2 text-ink-500" />
      </label>

      <label className="block">
        <div className="text-xs font-medium text-ink-700">NPI</div>
        <input value={npi} onChange={(e) => setNpi(e.target.value)} required
               className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="text-xs font-medium text-ink-700">License number</div>
          <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required
                 className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
        </label>
        <label className="block">
          <div className="text-xs font-medium text-ink-700">State</div>
          <input value={licenseState} onChange={(e) => setLicenseState(e.target.value)} required
                 className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
        </label>
        <label className="block">
          <div className="text-xs font-medium text-ink-700">Issue date</div>
          <input type="date" value={licenseIssue} onChange={(e) => setLicenseIssue(e.target.value)}
                 className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
        </label>
        <label className="block">
          <div className="text-xs font-medium text-ink-700">Expiry date</div>
          <input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} required
                 className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
        </label>
      </div>

      <label className="block">
        <div className="text-xs font-medium text-ink-700">Board certification</div>
        <input value={boardCert} onChange={(e) => setBoardCert(e.target.value)}
               className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
      </label>

      <label className="block">
        <div className="text-xs font-medium text-ink-700">License document URL</div>
        <input value={licenseDocUrl} onChange={(e) => setLicenseDocUrl(e.target.value)} placeholder="https://…"
               className="mt-1 w-full rounded border border-ink-200 px-3 py-2" />
        <div className="mt-1 text-xs text-ink-500">
          Upload your license PDF to a hosted URL (e.g. Dropbox / Drive) and paste the
          link here. Direct file upload coming soon.
        </div>
      </label>

      <fieldset className="block">
        <legend className="text-xs font-medium text-ink-700">Specialties</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {specialties.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={picked.includes(s)} onChange={() => togglePick(s)} />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">{error}</div>}

      <button type="submit" disabled={busy}
              className="rounded-md bg-cobalt-700 px-4 py-2 text-sm font-medium text-white hover:bg-cobalt-800 disabled:opacity-50">
        {busy ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}
