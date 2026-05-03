'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  token: string;
  email: string;
  invitedAt: string | null;
  submission: Record<string, any>;
}

export function OnboardingQueueRow({ token, email, invitedAt, submission }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: 'approve' | 'reject') {
    setErr(null);
    let reason: string | undefined;
    if (action === 'reject') {
      const r = window.prompt('Rejection reason (optional):') ?? '';
      reason = r || undefined;
    }
    setBusy(true);
    const res = await fetch(`/api/peers/invite/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'Failed');
      return;
    }
    router.refresh();
  }

  return (
    <>
      <tr className="border-b border-ink-100">
        <td className="px-4 py-2">
          <div className="font-medium text-ink-900">{submission.full_name ?? email}</div>
          <div className="text-xs text-ink-500">{email}</div>
        </td>
        <td className="px-4 py-2 text-ink-600">
          {invitedAt ? new Date(invitedAt).toLocaleDateString() : '—'}
        </td>
        <td className="px-4 py-2 text-right space-x-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
          >
            {open ? 'Hide' : 'View'}
          </button>
          <button
            type="button"
            onClick={() => act('approve')}
            disabled={busy}
            className="rounded-md bg-mint-600 px-3 py-1 text-xs font-medium text-white hover:bg-mint-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => act('reject')}
            disabled={busy}
            className="rounded-md border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            Reject
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={3} className="bg-ink-50/50 px-4 py-3 text-xs">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-ink-700">
              {JSON.stringify(submission, null, 2)}
            </pre>
            {err && <div className="mt-2 text-rose-600">{err}</div>}
          </td>
        </tr>
      )}
    </>
  );
}
