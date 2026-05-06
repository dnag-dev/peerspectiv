"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  Loader2,
  Search,
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
  scope: string;
  companyId: string | null;
  companyName: string | null;
  periodLabel: string | null;
  caseCount: number | null;
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

type Tab = "cadence" | "global";

export function TagsView({ initialTags }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("global");

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("cobalt");
  const [description, setDescription] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");

  const cadenceTags = useMemo(
    () => initialTags.filter((t) => t.scope === "cadence"),
    [initialTags]
  );
  const globalTags = useMemo(
    () => initialTags.filter((t) => t.scope !== "cadence"),
    [initialTags]
  );

  const visibleGlobal = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return globalTags;
    return globalTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [globalTags, searchQ]);

  // Unique company names for filter dropdown
  const cadenceCompanies = useMemo(() => {
    const names = new Set<string>();
    for (const t of cadenceTags) {
      if (t.companyName) names.add(t.companyName);
    }
    return Array.from(names).sort();
  }, [cadenceTags]);

  // Cadence: group by companyName (or "(No company)") then by periodLabel.
  const cadenceByCompany = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    let filtered = cadenceTags;
    if (companyFilter !== "all") {
      filtered = filtered.filter((t) => t.companyName === companyFilter);
    }
    if (q) {
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || (t.companyName ?? "").toLowerCase().includes(q));
    }
    const groups = new Map<string, TagRow[]>();
    for (const t of filtered) {
      const key = t.companyName || "(No company)";
      const arr = groups.get(key) ?? [];
      arr.push(t);
      groups.set(key, arr);
    }
    // Sort tags inside each group by periodLabel desc
    const entries = Array.from(groups.entries());
    for (const [, arr] of entries) {
      arr.sort((a: TagRow, b: TagRow) =>
        (b.periodLabel ?? "").localeCompare(a.periodLabel ?? "")
      );
    }
    return entries.sort(([a], [b]) => a.localeCompare(b));
  }, [cadenceTags, searchQ]);

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
        body: JSON.stringify({ name, color, description, scope: "global" }),
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
    if (!confirm("Delete this tag? This will also remove all associations."))
      return;
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
          Reusable labels for cases. Cadence tags are auto-generated when charts
          upload; global tags are admin-managed and apply across companies.
        </p>
      </div>

      {/* Tab strip */}
      <div className="border-b border-ink-200">
        <div className="flex gap-2">
          {(
            [
              ["global", `Global Tags (${globalTags.length})`],
              ["cadence", `Cadence Tags (${cadenceTags.length})`],
            ] as Array<[Tab, string]>
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-cobalt-600 text-cobalt-700"
                  : "border-transparent text-ink-600 hover:text-ink-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar shared between tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {tab === "global" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-ink-900">Create Global Tag</CardTitle>
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
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Tag</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Cases</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGlobal.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-ink-500"
                      >
                        {globalTags.length === 0
                          ? "No global tags yet. Create one above."
                          : "No tags match your search."}
                      </td>
                    </tr>
                  )}
                  {visibleGlobal.map((t) => {
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
                          {t.caseCount ?? 0}
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
        </>
      )}

      {tab === "cadence" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs text-ink-500">
              Cadence tags are auto-generated when charts are uploaded — one tag
              per (company, billing period). Read-only.
            </p>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {cadenceCompanies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {cadenceByCompany.length === 0 && (
            <Card>
              <CardContent className="px-4 py-12 text-center text-sm text-ink-500">
                {cadenceTags.length === 0
                  ? "No cadence tags yet. They'll appear here as charts are uploaded."
                  : "No cadence tags match your search."}
              </CardContent>
            </Card>
          )}
          {cadenceByCompany.map(([companyName, list]) => {
            const companyId = list[0]?.companyId;
            return (
            <Card key={companyName}>
              <CardHeader>
                <CardTitle className="text-base text-ink-900">
                  {companyId ? (
                    <Link href={`/companies/${companyId}`} className="text-cobalt-700 hover:underline">
                      {companyName}
                    </Link>
                  ) : (
                    companyName
                  )}
                  <span className="ml-2 text-xs font-normal text-ink-500">
                    ({list.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-ink-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Period</th>
                      <th className="px-4 py-2 text-right">Cases tagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((t) => {
                      const colorCls =
                        COLOR_CHIP[t.color ?? "amber"] ?? COLOR_CHIP.amber;
                      return (
                        <tr
                          key={t.id}
                          className="border-t border-ink-100 hover:bg-ink-50/50"
                        >
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${colorCls}`}
                            >
                              <TagIcon className="h-3 w-3" /> {t.name}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-ink-800">
                            {t.caseCount ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
