'use client';

/**
 * Phase 3.6 — Peer Scorecard rebuild for /peer/profile.
 *
 * 6 tiles per cadence period:
 *   1. Volume          (review count)
 *   2. Turnaround      (avg days, on-time %)
 *   3. Quality         (vs AI agreement_score)
 *   4. Kick-back rate  (returned_by_peer_at count)
 *   5. Specialty mix   (peer_specialties join)
 *   6. Earnings summary
 *
 * Trend: current vs prior 2 periods (sparklines via recharts inline).
 *
 * Persona access: peer = own only (page already locks to current peer);
 * cross-peer URL manipulation 403s server-side.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TileData {
  volume: number;
  turnaroundAvgDays: number | null;
  onTimePct: number | null;
  qualityVsAi: number | null;
  kickbackCount: number;
  specialties: Array<{ specialty: string; count: number }>;
  earnings: number;
}

interface PeriodResult {
  label: string;
  start_date: string;
  end_date: string;
  tiles: TileData;
}

interface Props {
  peerId: string;
}

export function MyScorecardTab({ peerId }: Props) {
  const [periods, setPeriods] = useState<PeriodResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/peers/${peerId}/scorecard`)
      .then((r) => (r.ok ? r.json() : { periods: [] }))
      .then((d: { periods?: PeriodResult[] }) =>
        setPeriods(Array.isArray(d.periods) ? d.periods : [])
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [peerId]);

  if (loading) {
    return (
      <p className="text-sm text-ink-secondary">
        <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Loading scorecard…
      </p>
    );
  }
  if (error) return <p className="text-sm text-destructive">Error: {error}</p>;
  if (periods.length === 0) {
    return <p className="text-sm text-ink-secondary">No scorecard data yet.</p>;
  }

  const current = periods[periods.length - 1];
  const trend = periods.slice(-3); // current + prior 2

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium tracking-tight text-ink-primary">{current.label}</h2>
        <p className="text-xs text-ink-secondary">
          {current.start_date} – {current.end_date}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Tile
          title="Volume"
          value={String(current.tiles.volume)}
          unit="reviews"
        />
        <Tile
          title="Turnaround"
          value={
            current.tiles.turnaroundAvgDays == null
              ? '—'
              : current.tiles.turnaroundAvgDays.toFixed(1)
          }
          unit="avg days"
          subline={
            current.tiles.onTimePct == null
              ? undefined
              : `${current.tiles.onTimePct.toFixed(0)}% on-time`
          }
        />
        <Tile
          title="Quality (vs AI)"
          value={
            current.tiles.qualityVsAi == null
              ? '—'
              : `${current.tiles.qualityVsAi.toFixed(1)}%`
          }
          unit="agreement"
        />
        <Tile
          title="Kick-back rate"
          value={String(current.tiles.kickbackCount)}
          unit="returned"
        />
        <Tile
          title="Specialty mix"
          value={String(current.tiles.specialties.length)}
          unit="specialties"
          subline={current.tiles.specialties
            .slice(0, 3)
            .map((s) => `${s.specialty} (${s.count})`)
            .join(', ')}
        />
        <Tile
          title="Earnings"
          value={`$${current.tiles.earnings.toFixed(2)}`}
          unit="this period"
        />
      </div>

      {trend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trend (last {trend.length} periods)</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-eyebrow text-ink-secondary">
                <tr>
                  <th className="text-left py-1">Period</th>
                  <th className="text-right py-1">Volume</th>
                  <th className="text-right py-1">Turnaround</th>
                  <th className="text-right py-1">Quality</th>
                  <th className="text-right py-1">Kick-backs</th>
                  <th className="text-right py-1">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((p) => (
                  <tr key={p.label} className="border-t border-border-subtle">
                    <td className="py-1">{p.label}</td>
                    <td className="text-right">{p.tiles.volume}</td>
                    <td className="text-right">
                      {p.tiles.turnaroundAvgDays == null
                        ? '—'
                        : `${p.tiles.turnaroundAvgDays.toFixed(1)}d`}
                    </td>
                    <td className="text-right">
                      {p.tiles.qualityVsAi == null
                        ? '—'
                        : `${p.tiles.qualityVsAi.toFixed(0)}%`}
                    </td>
                    <td className="text-right">{p.tiles.kickbackCount}</td>
                    <td className="text-right">${p.tiles.earnings.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Tile({
  title,
  value,
  unit,
  subline,
}: {
  title: string;
  value: string;
  unit?: string;
  subline?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs uppercase tracking-wider text-ink-secondary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium tracking-tight text-ink-primary">{value}</div>
        {unit && <div className="text-xs text-ink-secondary">{unit}</div>}
        {subline && <div className="text-xs text-ink-secondary mt-2">{subline}</div>}
      </CardContent>
    </Card>
  );
}
