"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Save, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingRow {
  id: string;
  settingKey: string;
  settingValue: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

interface Props {
  initialSettings: SettingRow[];
}

/**
 * Curated default keys we surface as ready-to-edit rows even before they exist
 * in the DB. Editing one upserts the row.
 */
const DEFAULT_KEYS: Array<{
  key: string;
  description: string;
  defaultValue: unknown;
}> = [
  {
    key: "default_due_days",
    description: "Default reviewer turnaround (days) when batch has none.",
    defaultValue: 7,
  },
  {
    key: "ai_assignment_enabled",
    description: "Whether AI-assisted assignment is on by default.",
    defaultValue: true,
  },
  {
    key: "alert_email",
    description: "Email that receives operational alerts (overdue, errors).",
    defaultValue: "ops@peerspectiv.com",
  },
  {
    key: "invoice_due_days",
    description: "Days from invoice send to due date.",
    defaultValue: 30,
  },
];

export function SettingsView({ initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Merge defaults with existing — existing wins.
  const byKey = new Map(initialSettings.map((s) => [s.settingKey, s]));
  const merged = [
    ...DEFAULT_KEYS.map((d) => {
      const existing = byKey.get(d.key);
      if (existing) {
        byKey.delete(d.key);
        return { ...existing, description: existing.description ?? d.description };
      }
      return {
        id: `default:${d.key}`,
        settingKey: d.key,
        settingValue: d.defaultValue,
        description: d.description,
        updatedBy: null,
        updatedAt: null,
      } as SettingRow;
    }),
    ...Array.from(byKey.values()),
  ];

  // Local edit buffer — string form.
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const s of merged) o[s.settingKey] = stringify(s.settingValue);
    return o;
  });

  async function handleSave(key: string, descFallback: string | null) {
    setErr(null);
    let parsed: unknown;
    const raw = draft[key] ?? "";
    try {
      parsed = JSON.parse(raw);
    } catch {
      // not valid JSON — treat as plain string
      parsed = raw;
    }
    setBusy(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "admin-demo",
        },
        body: JSON.stringify({
          settingKey: key,
          settingValue: parsed,
          description: descFallback ?? undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Reset ${key}? It will revert to its default.`)) return;
    setBusy(key);
    try {
      const res = await fetch(`/api/settings?settingKey=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  // Custom-key adder
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newDesc, setNewDesc] = useState("");

  async function handleCreate() {
    setErr(null);
    if (!newKey.trim()) {
      setErr("Key is required");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(newVal);
    } catch {
      parsed = newVal;
    }
    setBusy("__new__");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "admin-demo",
        },
        body: JSON.stringify({
          settingKey: newKey.trim(),
          settingValue: parsed,
          description: newDesc.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setNewKey("");
      setNewVal("");
      setNewDesc("");
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-cobalt-600" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Global key-value configuration. Values are JSON; plain strings are accepted.
          </p>
        </div>
      </div>

      {err && (
        <p className="text-sm text-critical-700 bg-critical-50 px-3 py-2 rounded">
          {err}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-ink-900">Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {merged.map((s) => {
            const isDefault = s.id.startsWith("default:");
            return (
              <div
                key={s.settingKey}
                className="grid gap-3 md:grid-cols-[200px_1fr_auto] items-start border-b border-ink-100 pb-4 last:border-b-0"
              >
                <div>
                  <p className="font-mono text-xs font-medium text-ink-900">
                    {s.settingKey}
                  </p>
                  {s.description && (
                    <p className="mt-1 text-xs text-ink-500">{s.description}</p>
                  )}
                  {!isDefault && s.updatedBy && (
                    <p className="mt-1 text-[10px] text-ink-400">
                      updated by {s.updatedBy}
                    </p>
                  )}
                </div>
                <Input
                  value={draft[s.settingKey] ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, [s.settingKey]: e.target.value }))
                  }
                  className="font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(s.settingKey, s.description)}
                    disabled={busy === s.settingKey}
                    className="bg-cobalt-600 hover:bg-cobalt-700"
                  >
                    {busy === s.settingKey ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                  {!isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(s.settingKey)}
                      disabled={busy === s.settingKey || isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-ink-900">Add Custom Setting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Key</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="my_custom_key"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label>Value (JSON or string)</Label>
              <Input
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                placeholder='"hello" or 42 or {"a":1}'
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={busy === "__new__"}
            className="bg-cobalt-600 hover:bg-cobalt-700"
          >
            {busy === "__new__" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function stringify(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v ?? "");
  }
}
