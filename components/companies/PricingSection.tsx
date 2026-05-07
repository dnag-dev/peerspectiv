"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Plus, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface RateRow {
  id: string;
  specialty: string;
  rateAmount: string;
  isDefault: boolean | null;
  effectiveFrom: string | null;
}

interface PricingState {
  pricing_mode: "flat" | "per_specialty";
  per_review_rate: string | null;
  itemize_invoice: boolean;
  rates: RateRow[];
}

const HEADERS = { "Content-Type": "application/json", "x-demo-user-id": "admin-demo" } as const;

export function PricingSection({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [state, setState] = useState<PricingState | null>(null);
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [flatRate, setFlatRate] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [newRate, setNewRate] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/pricing`),
        fetch(`/api/specialties`),
      ]);
      const p = await pRes.json();
      const s = await sRes.json();
      setState(p);
      setFlatRate(p.per_review_rate ? String(Number(p.per_review_rate)) : "");
      setSpecialties(s.data ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, [companyId]);

  if (loading || !state) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-5 w-5" /> Pricing</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-ink-secondary">Loading…</p></CardContent>
      </Card>
    );
  }

  async function patchTop(body: Record<string, unknown>) {
    setErr(null); setBusy("top");
    try {
      const res = await fetch(`/api/companies/${companyId}/pricing`, {
        method: "PATCH", headers: HEADERS, body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      await reload();
      router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  function changeMode(next: "flat" | "per_specialty") {
    if (next === state!.pricing_mode) return;
    if (next === "flat" && state!.rates.length > 0) {
      if (!confirm("All per-specialty rates will be archived (kept on file but unused). Continue?")) return;
    }
    patchTop({ pricing_mode: next });
  }

  async function addRate() {
    setErr(null);
    if (!newSpec) { setErr("Pick a specialty"); return; }
    const r = Number(newRate);
    if (!Number.isFinite(r) || r <= 0) { setErr("Rate must be positive"); return; }
    setBusy("__add__");
    try {
      const res = await fetch(`/api/companies/${companyId}/pricing`, {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ specialty: newSpec, rate_amount: r, is_default: false }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setNewSpec(""); setNewRate("");
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function patchRate(id: string, body: Record<string, unknown>) {
    setBusy(id); setErr(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/pricing/${id}`, {
        method: "PATCH", headers: HEADERS, body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function deleteRate(id: string) {
    if (!confirm("Remove this per-specialty rate?")) return;
    setBusy(id); setErr(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/pricing/${id}`, {
        method: "DELETE", headers: HEADERS,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  const mode = state.pricing_mode;
  const rateEdits: Record<string, string> = {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5" /> Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {err && <p className="text-sm text-status-danger-fg bg-critical-50 px-3 py-2 rounded">{err}</p>}

        {/* Mode toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">Mode:</Label>
          <Select value={mode} onValueChange={(v) => changeMode(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat rate</SelectItem>
              <SelectItem value="per_specialty">Per-specialty</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-ink-primary ml-4">
            <input type="checkbox" checked={state.itemize_invoice}
              onChange={(e) => patchTop({ itemize_invoice: e.target.checked })} />
            Itemise invoices (per-provider lines)
          </label>
        </div>

        {/* Flat rate */}
        {mode === "flat" && (
          <div className="grid gap-2 max-w-md">
            <Label>Flat rate per review ($)</Label>
            <p className="text-xs text-ink-secondary">Used for all invoices. Falls back to global pay rate if blank.</p>
            <div className="flex gap-2">
              <Input type="number" min={0.01} step={0.01} value={flatRate}
                onChange={(e) => setFlatRate(e.target.value)} className="w-32" />
              <Button size="sm" disabled={busy === "top"}
                onClick={() => {
                  const n = Number(flatRate);
                  if (!Number.isFinite(n) || n <= 0) { setErr("Rate must be positive"); return; }
                  patchTop({ per_review_rate: n });
                }}
                className="bg-cobalt-600 hover:bg-cobalt-700">
                {busy === "top" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Per-specialty table */}
        {mode === "per_specialty" && (
          <div className="space-y-4">
            <p className="text-xs text-ink-secondary">
              One row per specialty. Mark a row as <strong>default</strong> to use its rate when a case has a specialty without an explicit row.
              Rate changes apply from <strong>today forward</strong>; existing invoices are unaffected.
            </p>

            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-secondary text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Specialty</th>
                  <th className="px-3 py-2 text-right">Rate ($)</th>
                  <th className="px-3 py-2 text-left">Effective from</th>
                  <th className="px-3 py-2 text-center">Default fallback</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.rates.map((r) => (
                  <RateRowEditor key={r.id} row={r}
                    onSave={(rate) => patchRate(r.id, { rate_amount: rate })}
                    onSetDefault={() => patchRate(r.id, { is_default: !r.isDefault })}
                    onDelete={() => deleteRate(r.id)}
                    busy={busy === r.id} />
                ))}
                {state.rates.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-secondary">No per-specialty rates yet — add one below.</td></tr>
                )}
              </tbody>
            </table>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 max-w-2xl">
              <Select value={newSpec} onValueChange={setNewSpec}>
                <SelectTrigger><SelectValue placeholder="Add specialty…" /></SelectTrigger>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min={0.01} step={0.01} placeholder="Rate" value={newRate}
                onChange={(e) => setNewRate(e.target.value)} />
              <Button size="sm" disabled={busy === "__add__"} onClick={addRate}
                className="bg-cobalt-600 hover:bg-cobalt-700">
                {busy === "__add__" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Add</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RateRowEditor({
  row, onSave, onSetDefault, onDelete, busy,
}: {
  row: RateRow;
  onSave: (rate: number) => void;
  onSetDefault: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [val, setVal] = useState(String(Number(row.rateAmount)));
  const dirty = Number(val) !== Number(row.rateAmount);
  return (
    <tr className="border-t border-border-subtle">
      <td className="px-3 py-2">{row.specialty}</td>
      <td className="px-3 py-2 text-right">
        <Input type="number" min={0.01} step={0.01} value={val}
          onChange={(e) => setVal(e.target.value)} className="h-7 w-24 ml-auto text-right" />
      </td>
      <td className="px-3 py-2 text-ink-secondary">{row.effectiveFrom ?? "—"}</td>
      <td className="px-3 py-2 text-center">
        <button type="button" onClick={onSetDefault} disabled={busy} title="Set as default fallback">
          <Star className={`h-4 w-4 inline ${row.isDefault ? "fill-amber-400 text-amber-500" : "text-ink-tertiary"}`} />
        </button>
      </td>
      <td className="px-3 py-2 text-right space-x-1">
        {dirty && (
          <Button size="sm" disabled={busy}
            onClick={() => {
              const n = Number(val);
              if (!Number.isFinite(n) || n <= 0) return;
              onSave(n);
            }}
            className="bg-cobalt-600 hover:bg-cobalt-700">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}
