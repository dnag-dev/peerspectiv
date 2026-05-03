'use client';

/**
 * CadencePeriodPicker — snaps to cadence labels (NOT a free-form date picker).
 * SA-013E confirmation rule: users must pick from the company's actual cadence
 * periods so report labels match invoice labels.
 *
 * Loads `/api/companies/:id/cadence-periods` on mount and renders a Select.
 */

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CadencePeriodOption {
  label: string;
  start_date: string;
  end_date: string;
  type: string;
}

interface Props {
  companyId: string | null;
  value: string | null;
  onChange: (label: string, period: CadencePeriodOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CadencePeriodPicker({ companyId, value, onChange, placeholder, disabled }: Props) {
  const [periods, setPeriods] = useState<CadencePeriodOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setPeriods([]);
      return;
    }
    setLoading(true);
    setErr(null);
    fetch(`/api/companies/${companyId}/cadence-periods`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { periods: CadencePeriodOption[] }) => {
        setPeriods(Array.isArray(data?.periods) ? data.periods : []);
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : String(e));
        setPeriods([]);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handle = (label: string) => {
    const found = periods.find((p) => p.label === label) ?? null;
    onChange(label, found);
  };

  return (
    <Select
      value={value ?? undefined}
      onValueChange={handle}
      disabled={disabled || loading || periods.length === 0}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={
            loading
              ? 'Loading periods…'
              : err
              ? `Failed to load (${err})`
              : placeholder ?? 'Select cadence period'
          }
        />
      </SelectTrigger>
      <SelectContent>
        {/* Most recent first in the dropdown for convenience. */}
        {[...periods].reverse().map((p) => (
          <SelectItem key={`${p.label}-${p.start_date}`} value={p.label}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
