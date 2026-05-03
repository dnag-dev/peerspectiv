'use client';

/**
 * Phase 3.6 — "My Reviews" tab on /peer/profile.
 * Lists every review_results row submitted by the current peer with a
 * Download PDF button (Type 1 — Per-Provider Review Answers).
 *
 * Cross-peer URL manipulation → 403 (PR-040, persona-guard.ts).
 */

import { useEffect, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Review {
  result_id: string;
  provider_name: string;
  submitted_at: string;
  company_name: string;
  overall_score: number | null;
}

interface Props {
  peerId: string;
}

export function MyReviewsTab({ peerId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/peers/${peerId}/reviews`)
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d: { reviews?: Review[] }) =>
        setReviews(Array.isArray(d.reviews) ? d.reviews : [])
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [peerId]);

  async function downloadPdf(resultId: string) {
    setBusyId(resultId);
    setError(null);
    try {
      const r = await fetch(`/api/reports/generate/per_provider`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Demo-mode role + scope so server-side persona-guard locks to this peer.
          'x-demo-role': 'peer',
          'x-demo-peer-id': peerId,
        },
        body: JSON.stringify({ result_id: resultId }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text || `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `per-provider-${resultId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-ink-500">
            <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Loading…
          </p>
        )}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-ink-500">You have no submitted reviews yet.</p>
        )}
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
        {reviews.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-eyebrow text-ink-500">
              <tr>
                <th className="text-left py-2">Provider</th>
                <th className="text-left py-2">Company</th>
                <th className="text-left py-2">Submitted</th>
                <th className="text-right py-2">Score</th>
                <th className="text-right py-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.result_id} className="border-t border-ink-100">
                  <td className="py-2">{r.provider_name}</td>
                  <td className="py-2 text-ink-600">{r.company_name}</td>
                  <td className="py-2 text-ink-600">
                    {new Date(r.submitted_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="py-2 text-right">
                    {r.overall_score == null ? '—' : `${Number(r.overall_score).toFixed(1)}%`}
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadPdf(r.result_id)}
                      disabled={busyId === r.result_id}
                    >
                      {busyId === r.result_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
