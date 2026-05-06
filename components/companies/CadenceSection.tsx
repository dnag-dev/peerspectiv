"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { buildCadencePeriods, findPeriodForDate, type CadencePeriod } from "@/lib/cadence/core";

type Frequency = "quarterly" | "monthly" | "custom_multi_month";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HEADERS = { "Content-Type": "application/json", "x-demo-user-id": "admin-demo" } as const;

interface CadenceState {
  cadence_period_type: Frequency;
  fiscal_year_start_month: number;
  cadence_period_months: number | null;
}

export function CadenceSection({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [frequency, setFrequency] = useState<Frequency>("quarterly");
  const [fyStartMonth, setFyStartMonth] = useState(1);
  const [customMonths, setCustomMonths] = useState(2);
  const [activePeriodLabels, setActivePeriodLabels] = useState<Set<string>>(new Set());

  // Load periods that have actual batches/reviews
  const loadActivePeriods = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/cadence-periods?lookback_years=2`);
      if (!res.ok) return;
      const data = await res.json();
      // Check which period labels have batches
      const batchRes = await fetch(`/api/batches?company_id=${companyId}&limit=500`);
      if (!batchRes.ok) return;
      const batchData = await batchRes.json();
      const batches = batchData.data ?? batchData.batches ?? batchData ?? [];
      const labels = new Set<string>();
      for (const b of batches) {
        const name = b.batch_name ?? b.batchName ?? "";
        if (name) labels.add(name);
      }
      setActivePeriodLabels(labels);
    } catch { /* ignore */ }
  }, [companyId]);

  // Initial data load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}`);
        if (!res.ok) return;
        const company = await res.json();
        let f = company.cadence_period_type ?? "quarterly";
        const fy = company.fiscal_year_start_month ?? 1;
        const cm = company.cadence_period_months ?? 2;
        // Map custom_multi_month with known periods to friendly names
        if (f === "custom_multi_month" && cm === 6) f = "semi_annual";
        if (f === "custom_multi_month" && cm === 12) f = "annual";
        setFrequency(f);
        setFyStartMonth(fy);
        setCustomMonths(cm);
      } finally {
        setLoading(false);
      }
    })();
    loadActivePeriods();
  }, [companyId, loadActivePeriods]);

  // Compute periods client-side from the current UI state — instant preview
  const { periods, currentPeriod } = useMemo(() => {
    let computeType: string = frequency;
    let computeMonths: number | undefined = frequency === "custom_multi_month" ? customMonths : undefined;
    if (frequency === "semi_annual") { computeType = "custom_multi_month"; computeMonths = 6; }
    if (frequency === "annual") { computeType = "custom_multi_month"; computeMonths = 12; }

    const p = buildCadencePeriods(
      {
        fiscalYearStartMonth: fyStartMonth,
        type: computeType as any,
        customMonths: computeMonths,
      },
      new Date(),
      1
    );
    const todayIso = new Date().toISOString().slice(0, 10);
    const current = p.length > 0 ? findPeriodForDate(p, todayIso) : null;
    return { periods: p, currentPeriod: current };
  }, [frequency, fyStartMonth, customMonths]);

  async function handleSave() {
    setErr(null);
    setSaving(true);
    setSaved(false);

    if (frequency === "custom_multi_month") {
      if (customMonths < 2 || customMonths > 12) {
        setErr("Custom period must be between 2 and 12 months.");
        setSaving(false);
        return;
      }
    }

    try {
      // Map semi_annual and annual to custom_multi_month
      let apiFrequency = frequency;
      let apiMonths = customMonths;
      if (frequency === "semi_annual") {
        apiFrequency = "custom_multi_month";
        apiMonths = 6;
      } else if (frequency === "annual") {
        apiFrequency = "custom_multi_month";
        apiMonths = 12;
      }

      const payload: Record<string, unknown> = {
        cadence_period_type: apiFrequency,
        fiscal_year_start_month: fyStartMonth,
      };
      if (apiFrequency === "custom_multi_month") {
        payload.cadence_period_months = apiMonths;
      }

      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5" /> Review Cadence
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-ink-500">Loading…</p></CardContent>
      </Card>
    );
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateDisplay = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-5 w-5" /> Review Cadence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {err && <p className="text-sm text-critical-700 bg-critical-50 px-3 py-2 rounded">{err}</p>}
        {saved && <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded">Cadence saved.</p>}

        {/* Config controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="custom_multi_month">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fiscal Year Start</Label>
            <Select value={String(fyStartMonth)} onValueChange={(v) => setFyStartMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequency === "custom_multi_month" && (
            <div className="space-y-2">
              <Label>Period Length (months)</Label>
              <Input
                type="number"
                min={2}
                max={12}
                value={customMonths}
                onChange={(e) => setCustomMonths(Number(e.target.value))}
                className="w-24"
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-cobalt-600 hover:bg-cobalt-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Cadence
        </Button>

        {/* Current period preview */}
        {currentPeriod && (
          <div className="bg-ink-50 border border-ink-200 rounded-lg px-4 py-3">
            <p className="text-sm text-ink-700">
              Today is {dayName}, {dateDisplay} — current period:{" "}
              <span className="font-semibold text-cobalt-700">{currentPeriod.label}</span>
            </p>
            <p className="text-xs text-ink-500 mt-1">
              {currentPeriod.start_date} to {currentPeriod.end_date}
            </p>
          </div>
        )}

        {/* Period sequence — only show periods with actual reviews/batches */}
        {(() => {
          const periodsWithData = periods.filter((p) => activePeriodLabels.has(p.label));
          if (periodsWithData.length === 0) return null;
          return (
            <div className="space-y-2">
              <Label className="text-sm text-ink-600">Review periods with data ({periodsWithData.length})</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {periodsWithData.map((p, i) => {
                  const isCurrent = p.start_date <= todayStr && todayStr <= p.end_date;
                  return (
                    <div
                      key={i}
                      className={`text-xs rounded px-3 py-2 border ${
                        isCurrent
                          ? "border-cobalt-400 bg-cobalt-50 text-cobalt-800 font-medium"
                          : "border-ink-200 bg-white text-ink-600"
                      }`}
                    >
                      <div className="font-medium">{p.label}</div>
                      <div className="text-ink-400 mt-0.5">{p.start_date} → {p.end_date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
