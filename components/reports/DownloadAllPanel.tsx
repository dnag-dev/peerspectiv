'use client';

/**
 * Phase 3.7 — Download All ZIP. POSTs to /api/reports/download-all and
 * triggers a ZIP download containing all 5 PDFs + invoice stub for the
 * chosen company + cadence period.
 */

import { useState } from 'react';
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

interface Props {
  companies: { id: string; name: string }[];
}

export function DownloadAllPanel({ companies }: Props) {
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState<string | null>(null);
  const [periodObj, setPeriodObj] = useState<CadencePeriodOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!companyId || !period || !periodObj) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/reports/download-all', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          cadence_period_label: period,
          range_start: periodObj.start_date,
          range_end: periodObj.end_date,
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text || `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const co = companies.find((c) => c.id === companyId)?.name ?? 'reports';
      a.download = `${co}_${period}_All_Reports.zip`;
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
        <CardTitle>Download All (ZIP)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Company</Label>
          <Select value={companyId || undefined} onValueChange={setCompanyId}>
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
        </div>
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
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
        <div className="flex justify-end">
          <Button onClick={generate} disabled={busy || !companyId || !period}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bundling…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download ZIP
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
