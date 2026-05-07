"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Save, Loader2, Plus, Mail, FileText, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SettingRow {
  id: string;
  settingKey: string;
  settingValue: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

interface Props { initialSettings: SettingRow[]; }

const HEADERS = { "Content-Type": "application/json", "x-demo-user-id": "admin-demo" } as const;

function readNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); if (Number.isFinite(n)) return n; }
  return fallback;
}
function readBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1";
  return fallback;
}

export function SettingsView({ initialSettings }: Props) {
  const byKey = new Map(initialSettings.map((s) => [s.settingKey, s.settingValue]));
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-status-info-dot" />
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Global configuration, specialty taxonomy, credentialer rates, and email templates.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general"><FileText className="h-4 w-4 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="taxonomy"><Tag className="h-4 w-4 mr-1.5" />Specialty Taxonomy</TabsTrigger>
          <TabsTrigger value="credentialers"><Users className="h-4 w-4 mr-1.5" />Credentialers</TabsTrigger>
          <TabsTrigger value="templates"><Mail className="h-4 w-4 mr-1.5" />Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="general"><GeneralTab byKey={byKey} /></TabsContent>
        <TabsContent value="taxonomy"><TaxonomyTab /></TabsContent>
        <TabsContent value="credentialers"><CredentialersTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── General tab — file expiration, global pay rate, behind-firewall toggle ─── */
function GeneralTab({ byKey }: { byKey: Map<string, unknown> }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [fileDays, setFileDays] = useState(() =>
    String(readNum(byKey.get("file_expiration_days"), 30))
  );
  const [payRate, setPayRate] = useState(() =>
    String(readNum(byKey.get("global_pay_rate_per_review"), 35))
  );
  const [firewallAfter, setFirewallAfter] = useState(() =>
    readBool(byKey.get("files_behind_firewall_after_retention"), false)
  );

  async function save(key: string, value: unknown) {
    setErr(null);
    setBusy(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: HEADERS,
        body: JSON.stringify({ settingKey: key, settingValue: value }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  function validatePositive(s: string): number | null {
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-ink-primary">General</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {err && <p className="text-sm text-status-danger-fg bg-critical-50 px-3 py-2 rounded">{err}</p>}

        <div className="grid gap-2 max-w-md">
          <Label>File expiration (days)</Label>
          <p className="text-xs text-ink-secondary">Uploaded chart files auto-deleted after this many days.</p>
          <div className="flex gap-2">
            <Input type="number" min={1} step={1} value={fileDays}
              onChange={(e) => setFileDays(e.target.value)} className="w-32" />
            <Button size="sm" disabled={busy === "file_expiration_days"}
              onClick={() => {
                const n = validatePositive(fileDays);
                if (n === null) { setErr("File expiration must be a positive integer"); return; }
                save("file_expiration_days", Math.trunc(n));
              }}
              className="bg-cobalt-600 hover:bg-cobalt-700">
              {busy === "file_expiration_days" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <div className="grid gap-2 max-w-md">
          <Label>Global Pay Rate per Review ($)</Label>
          <p className="text-xs text-ink-secondary">Default per-review pay rate for peers. Negative values are rejected.</p>
          <div className="flex gap-2">
            <Input type="number" min={0.01} step={0.01} value={payRate}
              onChange={(e) => setPayRate(e.target.value)} className="w-32" />
            <Button size="sm" disabled={busy === "global_pay_rate_per_review"}
              onClick={() => {
                const n = validatePositive(payRate);
                if (n === null) { setErr("Pay rate must be a positive number"); return; }
                save("global_pay_rate_per_review", n);
              }}
              className="bg-cobalt-600 hover:bg-cobalt-700">
              {busy === "global_pay_rate_per_review" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-3 max-w-md">
          <input id="firewall" type="checkbox" className="mt-1"
            checked={firewallAfter}
            onChange={(e) => { setFirewallAfter(e.target.checked); save("files_behind_firewall_after_retention", e.target.checked); }} />
          <div>
            <Label htmlFor="firewall">Move files behind firewall after retention</Label>
            <p className="text-xs text-ink-secondary mt-0.5">When enabled, files past their expiration are archived behind firewall instead of being deleted.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Specialty Taxonomy tab (SA-105 / SA-106) ─── */
interface SpecialtyRow { id: string; name: string; isActive: boolean | null; }

function TaxonomyTab() {
  const [rows, setRows] = useState<SpecialtyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/specialty-taxonomy");
      const j = await res.json();
      setRows(j.data ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function add() {
    setErr(null);
    if (!newName.trim()) { setErr("Name required"); return; }
    setBusy("__new__");
    try {
      const res = await fetch("/api/specialty-taxonomy", {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ name: newName.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setNewName("");
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id); setErr(null);
    try {
      const res = await fetch(`/api/specialty-taxonomy/${id}`, {
        method: "PATCH", headers: HEADERS, body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setEditingId(null);
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-ink-primary">Specialty Taxonomy</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="text-sm text-status-danger-fg bg-critical-50 px-3 py-2 rounded">{err}</p>}

        <div className="flex gap-2 max-w-md">
          <Input placeholder="New specialty name" value={newName}
            onChange={(e) => setNewName(e.target.value)} />
          <Button size="sm" onClick={add} disabled={busy === "__new__"} className="bg-cobalt-600 hover:bg-cobalt-700">
            {busy === "__new__" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Add</>}
          </Button>
        </div>

        {loading ? <p className="text-sm text-ink-secondary">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-secondary text-xs uppercase">
              <tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border-subtle">
                  <td className="px-3 py-2">
                    {editingId === r.id ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7" />
                    ) : r.name}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs ${r.isActive ? "bg-mint-50 text-status-success-fg" : "bg-ink-100 text-ink-secondary"}`}>
                      {r.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {editingId === r.id ? (
                      <>
                        <Button size="sm" disabled={busy === r.id}
                          onClick={() => patch(r.id, { name: editName })} className="bg-cobalt-600 hover:bg-cobalt-700">
                          {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setEditName(r.name); }}>Edit</Button>
                        {r.isActive ? (
                          <Button size="sm" variant="outline" disabled={busy === r.id}
                            onClick={() => patch(r.id, { is_active: false })}>
                            {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Deactivate"}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busy === r.id}
                            onClick={() => patch(r.id, { is_active: true })}>
                            Reactivate
                          </Button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-ink-secondary">No specialties yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Credentialers tab ─── */
interface CredentialerRow {
  id: string; email: string; fullName: string | null;
  perPeerRate: string; isActive: boolean | null;
}
interface RateHistoryRow { rateAtAction: string | null; action: string; performedAt: string; }

function CredentialersTab() {
  const [rows, setRows] = useState<CredentialerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("100");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<RateHistoryRow[]>([]);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/credentialer-users");
      const j = await res.json();
      setRows(j.data ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function add() {
    setErr(null);
    const rate = Number(newRate);
    if (!newEmail.trim()) { setErr("Email required"); return; }
    if (!Number.isFinite(rate) || rate <= 0) { setErr("Rate must be positive"); return; }
    setBusy("__new__");
    try {
      const res = await fetch("/api/credentialer-users", {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ email: newEmail.trim(), full_name: newName.trim(), per_peer_rate: rate }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setNewEmail(""); setNewName(""); setNewRate("100");
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function saveRate(id: string) {
    setErr(null);
    const rate = Number(edits[id]);
    if (!Number.isFinite(rate) || rate <= 0) { setErr("Rate must be positive"); return; }
    setBusy(id);
    try {
      const res = await fetch(`/api/credentialer-users/${id}`, {
        method: "PATCH", headers: HEADERS,
        body: JSON.stringify({ per_peer_rate: rate }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setEdits((p) => { const n = { ...p }; delete n[id]; return n; });
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function openHistory(id: string) {
    setHistoryFor(id);
    setHistory([]);
    const res = await fetch(`/api/credentialer-users/${id}`);
    const j = await res.json();
    setHistory(j.rate_history ?? []);
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-ink-primary">Credentialers</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {err && <p className="text-sm text-status-danger-fg bg-critical-50 px-3 py-2 rounded">{err}</p>}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-2">
            <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input type="number" min={0.01} step={0.01} placeholder="Rate" value={newRate}
              onChange={(e) => setNewRate(e.target.value)} />
            <Button size="sm" onClick={add} disabled={busy === "__new__"} className="bg-cobalt-600 hover:bg-cobalt-700">
              {busy === "__new__" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Add</>}
            </Button>
          </div>

          {loading ? <p className="text-sm text-ink-secondary">Loading…</p> : (
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-secondary text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-right">Per-peer rate ($)</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const editVal = edits[r.id] ?? r.perPeerRate;
                  const dirty = edits[r.id] !== undefined && Number(edits[r.id]) !== Number(r.perPeerRate);
                  return (
                    <tr key={r.id} className="border-t border-border-subtle">
                      <td className="px-3 py-2">{r.email}</td>
                      <td className="px-3 py-2">{r.fullName ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min={0.01} step={0.01} value={editVal}
                          onChange={(e) => setEdits((p) => ({ ...p, [r.id]: e.target.value }))}
                          className="h-7 w-24 ml-auto text-right" />
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        {dirty && (
                          <Button size="sm" disabled={busy === r.id}
                            onClick={() => saveRate(r.id)} className="bg-cobalt-600 hover:bg-cobalt-700">
                            {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openHistory(r.id)}>History</Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-secondary">No credentialers yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setHistoryFor(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium tracking-tight text-ink-primary mb-3">Rate change history</h3>
            {history.length === 0 ? (
              <p className="text-sm text-ink-secondary">No rate-stamped actions recorded yet.</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {history.map((h, i) => (
                  <li key={i} className="text-xs flex justify-between border-b border-border-subtle pb-1">
                    <span>{h.action} · {new Date(h.performedAt).toLocaleString()}</span>
                    <span className="font-mono">${h.rateAtAction ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 text-right">
              <Button size="sm" variant="outline" onClick={() => setHistoryFor(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Email Templates tab — read-only stub ─── */
function TemplatesTab() {
  const templates = [
    { name: "New case assigned", description: "Sent to peer when a case is assigned." },
    { name: "Past due reminder", description: "Sent to peer at +1d, +3d, +7d after due date." },
    { name: "License expires soon", description: "Sent to credentialing inbox at 14/7/3/1 days before expiry." },
    { name: "Invoice issued", description: "Sent to client billing contact when an invoice transitions to sent." },
    { name: "Credentialing review needed", description: "Sent to credentialing inbox when a new peer is invited." },
    { name: "Peer invitation", description: "Sent to a peer when an admin issues an invite token." },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-ink-primary">Email Templates</CardTitle></CardHeader>
      <CardContent>
        <p className="text-xs text-ink-secondary mb-3">Read-only preview. Customisation is on the wishlist; today templates live in <code>lib/email/notifications.ts</code> as inline HTML.</p>
        <ul className="divide-y divide-border-subtle border border-border-subtle rounded">
          {templates.map((t) => (
            <li key={t.name} className="px-4 py-3">
              <div className="font-medium text-ink-primary text-sm">{t.name}</div>
              <div className="text-xs text-ink-secondary mt-0.5">{t.description}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
