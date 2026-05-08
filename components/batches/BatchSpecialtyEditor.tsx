"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface Props {
  batchId: string;
  currentSpecialty: string;
}

export function BatchSpecialtyEditor({ batchId, currentSpecialty }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState(currentSpecialty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((d) => setSpecialties(d.data ?? []))
      .catch(() => setSpecialties([]));
  }, [editing]);

  async function handleSave() {
    if (selected === currentSpecialty) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update specialty");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update specialty");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{currentSpecialty || "—"}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      >
        {specialties.length === 0 && (
          <option value={currentSpecialty}>{currentSpecialty}</option>
        )}
        {specialties.map((s) => (
          <option key={s.id} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditing(false); setSelected(currentSpecialty); }}>
          <X className="mr-1 h-3 w-3" /> Cancel
        </Button>
        <Button size="sm" className="h-7" onClick={handleSave} disabled={saving || !selected}>
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
          Save
        </Button>
      </div>
    </div>
  );
}
