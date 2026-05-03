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
  peerId: string;
  peerName: string;
  onSuccess: (status: string) => void;
}

const REASONS = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'medical_leave', label: 'Medical Leave' },
  { value: 'personal_leave', label: 'Personal Leave' },
  { value: 'other', label: 'Other' },
];

export function SetUnavailableModal({ open, onClose, peerId, peerName, onSuccess }: Props) {
  const [reason, setReason] = useState('vacation');
  const [fromDate, setFromDate] = useState('');
  const [untilDate, setUntilDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const statusMap: Record<string, string> = {
      vacation: 'vacation',
      medical_leave: 'on_leave',
      personal_leave: 'on_leave',
      other: 'inactive',
    };

    try {
      const res = await fetch(`/api/peers/${peerId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability_status: statusMap[reason] || 'inactive',
          unavailable_from: fromDate || null,
          unavailable_until: untilDate || null,
          unavailable_reason: `${REASONS.find(r => r.value === reason)?.label}${notes ? ': ' + notes : ''}`,
        }),
      });

      if (res.ok) {
        onSuccess(statusMap[reason] || 'inactive');
        setReason('vacation');
        setFromDate('');
        setUntilDate('');
        setNotes('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set {peerName} Unavailable</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Until (optional)
            </label>
            <input
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm"
              placeholder="Additional details..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
