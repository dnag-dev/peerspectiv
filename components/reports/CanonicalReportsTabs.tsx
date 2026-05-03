'use client';

/**
 * Phase 3.3 — Admin reports rewrite. Renders one panel per canonical report
 * type. Each panel: company picker → cadence period picker → optional extra
 * filter → "Generate PDF" button → POST /api/reports/generate/{type} →
 * triggers download.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CadencePeriodPicker,
  type CadencePeriodOption,
} from '@/components/cadence/CadencePeriodPicker';

interface Company {
  id: string;
  name: string;
}

interface Props {
  companies: Company[];
  /** Canonical type to render (one tab → one panel). */
  type:
    | 'per_provider'
    | 'question_analytics'
    | 'specialty_highlights'
    | 'provider_highlights'
    | 'quality_certificate';
  /** When set, hides the company picker and locks all requests to this id.
   *  Used by the client portal so the user cannot URL-pivot to another tenant.
   *  Server still enforces — this is UX only. */
  lockedCompanyId?: string;
}

interface ReviewOption {
  id: string;
  label: string;
}

function CompanyPicker({
  companies,
  value,
  onChange,
}: {
  companies: Company[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CanonicalReportPanel({ companies, type, lockedCompanyId }: Props) {
  const [companyId, setCompanyId] = useState(lockedCompanyId ?? '');
  const [period, setPeriod] = useState<string | null>(null);
  const [periodObj, setPeriodObj] = useState<CadencePeriodOption | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [resultId, setResultId] = useState('');
  const [reviews, setReviews] = useState<ReviewOption[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For #2 Question Analytics — load specialty list for the company.
  useEffect(() => {
    if (type !== 'question_analytics' || !companyId) return;
    fetch(`/api/reports/data?kind=company_specialties&company_id=${companyId}`)
      .then((r) => (r.ok ? r.json() : { specialties: [] }))
      .then((d: { specialties?: string[] }) =>
        setSpecialties(Array.isArray(d.specialties) ? d.specialties : [])
      )
      .catch(() => setSpecialties([]));
  }, [type, companyId]);

  // For #1 Per-Provider — load reviews in the selected period.
  useEffect(() => {
    if (type !== 'per_provider' || !companyId || !periodObj) return;
    const url = new URL('/api/reports/data', window.location.origin);
    url.searchParams.set('kind', 'reviews_in_period');
    url.searchParams.set('company_id', companyId);
    url.searchParams.set('start', periodObj.start_date);
    url.searchParams.set('end', periodObj.end_date);
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d: { reviews?: ReviewOption[] }) =>
        setReviews(Array.isArray(d.reviews) ? d.reviews : [])
      )
      .catch(() => setReviews([]));
  }, [type, companyId, periodObj]);

  const canGenerate = useMemo(() => {
    if (busy) return false;
    if (type === 'per_provider') return !!resultId;
    if (!companyId) return false;
    if (type === 'quality_certificate') return !!period;
    return !!periodObj; // need date range
  }, [type, busy, companyId, period, periodObj, resultId]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (type === 'per_provider') {
        body.result_id = resultId;
      } else {
        body.company_id = companyId;
        if (periodObj) {
          body.range_start = periodObj.start_date;
          body.range_end = periodObj.end_date;
        }
        body.cadence_period_label = period;
        if (type === 'question_analytics' && specialty) {
          body.specialty = specialty;
        }
      }

      const r = await fetch(`/api/reports/generate/${type}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text || `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITLES[type]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!lockedCompanyId && (
          <div className="space-y-2">
            <Label>Company</Label>
            <CompanyPicker companies={companies} value={companyId} onChange={setCompanyId} />
          </div>
        )}

        <div className="space-y-2">
          <Label>Cadence period</Label>
          <CadencePeriodPicker
            companyId={companyId || null}
            value={period}
            onChange={(label, p) => {
              setPeriod(label);
              setPeriodObj(p);
            }}
          />
        </div>

        {type === 'question_analytics' && (
          <div className="space-y-2">
            <Label>Specialty (optional)</Label>
            <Select value={specialty || undefined} onValueChange={setSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="All specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All specialties</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'per_provider' && (
          <div className="space-y-2">
            <Label>Review</Label>
            <Select value={resultId || undefined} onValueChange={setResultId}>
              <SelectTrigger>
                <SelectValue placeholder={reviews.length ? 'Select a review' : 'Pick company + period first'} />
              </SelectTrigger>
              <SelectContent>
                {reviews.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">Error: {error}</p>
        )}

        <div className="flex justify-end">
          <Button onClick={generate} disabled={!canGenerate}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Generate PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const TITLES: Record<Props['type'], string> = {
  per_provider: 'Per-Provider Review Answers',
  question_analytics: 'Question Analytics',
  specialty_highlights: 'Specialty Highlights',
  provider_highlights: 'Provider Highlights',
  quality_certificate: 'Quality Certificate',
};
