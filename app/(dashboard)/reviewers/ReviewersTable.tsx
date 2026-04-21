'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SetUnavailableModal } from '@/components/reviewers/SetUnavailableModal';

interface Reviewer {
  id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  active_cases_count: number | null;
  total_reviews_completed: number | null;
  availability_status: string | null;
  status: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-800' },
  vacation: { bg: 'bg-red-100', text: 'text-red-800' },
  on_leave: { bg: 'bg-amber-100', text: 'text-amber-800' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export function ReviewersTable({ reviewers: initial }: { reviewers: Reviewer[] }) {
  const [reviewers, setReviewers] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<Reviewer | null>(null);

  function handleSetUnavailable(reviewer: Reviewer) {
    setSelectedReviewer(reviewer);
    setModalOpen(true);
  }

  async function handleMarkAvailable(reviewer: Reviewer) {
    const res = await fetch(`/api/reviewers/${reviewer.id}/availability`, {
      method: 'POST',
    });
    if (res.ok) {
      setReviewers((prev) =>
        prev.map((r) =>
          r.id === reviewer.id
            ? { ...r, availability_status: 'available' }
            : r
        )
      );
    }
  }

  function handleModalSuccess(reviewerId: string, status: string) {
    setReviewers((prev) =>
      prev.map((r) =>
        r.id === reviewerId
          ? { ...r, availability_status: status }
          : r
      )
    );
    setModalOpen(false);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Active Cases</th>
              <th className="px-4 py-3">Total Reviews</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviewers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
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
                    {r.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.specialty ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.active_cases_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{r.total_reviews_completed ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${colors.bg} ${colors.text} border-0`}>
                      {status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {status === 'available' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetUnavailable(r)}
                      >
                        Set Unavailable
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAvailable(r)}
                      >
                        Mark Available
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedReviewer && (
        <SetUnavailableModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          reviewerId={selectedReviewer.id}
          reviewerName={selectedReviewer.full_name ?? 'Reviewer'}
          onSuccess={(status) => handleModalSuccess(selectedReviewer.id, status)}
        />
      )}
    </>
  );
}
