"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TagRow {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  usageCount: number | null;
  createdBy: string | null;
  createdAt: Date | null;
}

interface Props {
  initialTags: TagRow[];
}

const COLOR_OPTS = ["cobalt", "mint", "amber", "critical", "ink"] as const;

const COLOR_CHIP: Record<string, string> = {
  cobalt: "bg-cobalt-100 text-cobalt-700 border-cobalt-200",
  mint: "bg-mint-100 text-mint-700 border-mint-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-critical-100 text-critical-700 border-critical-200",
  ink: "bg-ink-100 text-ink-700 border-ink-200",
};

export function TagsView({ initialTags }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("cobalt");
  const [description, setDescription] = useState("");

  // Filter / sort state
  const [searchQ, setSearchQ] = useState("");
  type SortKey = "name" | "usageCount";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return initialTags;
    return initialTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [initialTags, searchQ]);

  const visible = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: number | string = "";
      let bv: number | string = "";
      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "usageCount":
          av = a.usageCount ?? 0;
          bv = b.usageCount ?? 0;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function SortHead({
    label,
    k,
    align = "left",
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        onClick={() => toggleSort(k)}
        className={`px-4 py-3 cursor-pointer select-none hover:text-ink-900 ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`h-3 w-3 ${active ? "text-cobalt-600" : "text-ink-300"}`} />
        </span>
      </th>
    );
  }

  async function handleCreate() {
    setErr(null);
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    setBusy("create");
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-user-id": "admin-demo",
        },
        body: JSON.stringify({ name, color, description }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setName("");
      setDescription("");
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tag? This will also remove all associations.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Tags</h1>
        <p className="text-sm text-muted-foreground">
          Reusable labels for cases, batches, and peers. Used to filter
          reports and group cohorts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-ink-900">Create Tag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="high-acuity"
              />
            </div>
            <div>
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          {err && (
            <p className="text-sm text-critical-700 bg-critical-50 px-3 py-2 rounded">
              {err}
            </p>
          )}
          <Button
            onClick={handleCreate}
            disabled={busy === "create"}
            className="bg-cobalt-600 hover:bg-cobalt-700"
          >
            {busy === "create" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search name, description…"
                className="pl-9"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Showing <strong>{visible.length}</strong> of {initialTags.length} tags
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-600 text-xs uppercase">
              <tr>
                <SortHead label="Tag" k="name" />
                <th className="px-4 py-3 text-left">Description</th>
                <SortHead label="Usage" k="usageCount" align="right" />
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-ink-500"
                  >
                    {initialTags.length === 0
                      ? "No tags yet. Create one above."
                      : "No tags match your search."}
                  </td>
                </tr>
              )}
              {visible.map((t) => {
                const colorCls =
                  COLOR_CHIP[t.color ?? "cobalt"] ?? COLOR_CHIP.cobalt;
                return (
                  <tr
                    key={t.id}
                    className="border-t border-ink-100 hover:bg-ink-50/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${colorCls}`}
                      >
                        <TagIcon className="h-3 w-3" /> {t.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {t.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-800">
                      {t.usageCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(t.id)}
                        disabled={busy === t.id || isPending}
                        className="h-7 text-xs"
                      >
                        {busy === t.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
