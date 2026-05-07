"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Pencil,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormBuilderModal } from "@/components/forms/FormBuilderModal";

interface FormRow {
  id: string;
  companyId: string | null;
  companyName: string | null;
  specialty: string;
  formName: string;
  formFields: unknown;
  isActive: boolean | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date | null;
  templatePdfUrl: string | null;
  templatePdfName: string | null;
  scoringSystem?: string | null;
  responseCount?: number;
  avgDurationMin?: number | null;
}


interface Props {
  forms: FormRow[];
  companies: { id: string; name: string }[];
}

type SortKey =
  | "companyName"
  | "specialty"
  | "formName"
  | "fieldCount"
  | "isActive";
type SortDir = "asc" | "desc";

function fieldCountOf(f: FormRow): number {
  return Array.isArray(f.formFields) ? f.formFields.length : 0;
}

export function FormsView({ forms, companies }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("companyName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [showBuilder, setShowBuilder] = useState(false);
  const [builderCompanyId, setBuilderCompanyId] = useState<string>("");
  const [builderCompanyName, setBuilderCompanyName] = useState<string>("");
  const [editing, setEditing] = useState<{
    id: string;
    form_name: string;
    form_identifier?: string | null;
    specialty: string;
    form_fields: any[];
    allow_ai_generated_recommendations?: boolean;
    scoring_system?: "yes_no_na" | "abc_na" | "pass_fail";
    pass_fail_threshold?: { fail_if_any_critical_no?: boolean } | null;
  } | null>(null);
  const [prefill, setPrefill] = useState<{
    form_name: string;
    form_identifier?: string | null;
    specialty: string;
    form_fields: any[];
    allow_ai_generated_recommendations?: boolean;
    scoring_system?: "yes_no_na" | "abc_na" | "pass_fail";
    pass_fail_threshold?: { fail_if_any_critical_no?: boolean } | null;
  } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Distinct specialties for filter dropdown
  const specialties = useMemo(() => {
    const s = new Set<string>();
    for (const f of forms) if (f.specialty) s.add(f.specialty);
    return Array.from(s).sort();
  }, [forms]);

  // Filter + search
  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return forms.filter((f) => {
      if (companyFilter !== "all" && f.companyId !== companyFilter) return false;
      if (specialtyFilter !== "all" && f.specialty !== specialtyFilter) return false;
      if (statusFilter === "active" && !f.isActive) return false;
      if (statusFilter === "inactive" && f.isActive) return false;
      if (!q) return true;
      return (
        (f.companyName ?? "").toLowerCase().includes(q) ||
        f.specialty.toLowerCase().includes(q) ||
        f.formName.toLowerCase().includes(q)
      );
    });
  }, [forms, companyFilter, specialtyFilter, statusFilter, searchQ]);

  // Sort
  const visible = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: number | string = "";
      let bv: number | string = "";
      switch (sortKey) {
        case "companyName":
          av = (a.companyName ?? "").toLowerCase();
          bv = (b.companyName ?? "").toLowerCase();
          break;
        case "specialty":
          av = a.specialty.toLowerCase();
          bv = b.specialty.toLowerCase();
          break;
        case "formName":
          av = a.formName.toLowerCase();
          bv = b.formName.toLowerCase();
          break;
        case "fieldCount":
          av = fieldCountOf(a);
          bv = fieldCountOf(b);
          break;
        case "isActive":
          av = a.isActive ? 1 : 0;
          bv = b.isActive ? 1 : 0;
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
        className={`px-4 py-3 cursor-pointer select-none hover:text-ink-primary ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`h-3 w-3 ${active ? "text-status-info-dot" : "text-ink-tertiary"}`} />
        </span>
      </th>
    );
  }

  async function toggleActive(id: string, current: boolean | null) {
    const res = await fetch(`/api/company-forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  function openBuilder(companyId: string, companyNameVal?: string) {
    setEditing(null);
    setPrefill(null);
    setBuilderCompanyId(companyId);
    setBuilderCompanyName(companyNameVal || "");
    setShowBuilder(true);
  }

  async function openEdit(f: FormRow) {
    if (!f.companyId) return;
    setLoadingId(f.id);
    try {
      const res = await fetch(`/api/company-forms/${f.id}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setPrefill(null);
      setEditing({
        id: f.id,
        form_name: j.form.form_name,
        form_identifier: j.form.form_identifier ?? null,
        specialty: j.form.specialty,
        form_fields: Array.isArray(j.form.form_fields) ? j.form.form_fields : [],
        allow_ai_generated_recommendations: !!j.form.allow_ai_generated_recommendations,
        scoring_system: j.form.scoring_system ?? "yes_no_na",
        pass_fail_threshold: j.form.pass_fail_threshold ?? null,
      });
      setBuilderCompanyId(f.companyId);
      setBuilderCompanyName(f.companyName || "");
      setShowBuilder(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(f: FormRow) {
    if (!confirm(`Delete "${f.formName}"? This cannot be undone.`)) return;
    setDeletingId(f.id);
    try {
      const r = await fetch(`/api/company-forms/${f.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClone(f: FormRow) {
    if (!f.companyId) return;
    setCloningId(f.id);
    try {
      // Pull full form (we need form_fields), then open builder prefilled.
      const r = await fetch(`/api/company-forms/${f.id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      const fields = Array.isArray(j.form.form_fields) ? j.form.form_fields : [];
      setEditing(null);
      setPrefill({
        form_name: `${f.formName} (Copy)`,
        form_identifier: j.form.form_identifier ? `${j.form.form_identifier} (Copy)` : null,
        specialty: f.specialty,
        form_fields: fields,
        allow_ai_generated_recommendations: !!j.form.allow_ai_generated_recommendations,
        scoring_system: j.form.scoring_system ?? "yes_no_na",
        pass_fail_threshold: j.form.pass_fail_threshold ?? null,
      });
      setBuilderCompanyId(f.companyId);
      setBuilderCompanyName(f.companyName || "");
      setShowBuilder(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCloningId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Forms</h1>
          <p className="text-sm text-muted-foreground">
            Manage peer-review form templates per company and specialty.
          </p>
        </div>
        <Button
          onClick={() => {
            const c = companyFilter !== "all"
              ? companies.find((x) => x.id === companyFilter)
              : undefined;
            openBuilder(c?.id ?? "", c?.name);
          }}
          disabled={companies.length === 0}
          className="bg-brand hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4 mr-2" /> New Form
        </Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_140px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search company, specialty, form name…"
                className="pl-9"
              />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-ink-secondary">
            Showing <strong>{visible.length}</strong> of {forms.length} forms
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-secondary text-xs uppercase">
              <tr>
                <SortHead label="Company" k="companyName" />
                <SortHead label="Specialty" k="specialty" />
                <SortHead label="Form Name" k="formName" />
                <SortHead label="Fields" k="fieldCount" align="right" />
                <th className="px-4 py-3 text-right">Responses</th>
                <th className="px-4 py-3 text-right">Avg Duration</th>
                <th className="px-4 py-3 text-left">Template</th>
                <SortHead label="Status" k="isActive" />
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-ink-secondary">
                    {forms.length === 0 ? (
                      <>No forms yet. Click <strong>New Form</strong> to build one.</>
                    ) : (
                      <>No forms match your filters.</>
                    )}
                  </td>
                </tr>
              )}
              {visible.map((f) => {
                const fieldCount = fieldCountOf(f);
                return (
                  <tr key={f.id} className="border-t border-border-subtle hover:bg-ink-50/50">
                    <td className="px-4 py-3 text-ink-primary">{f.companyName ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-primary">{f.specialty}</td>
                    <td className="px-4 py-3 text-ink-primary font-medium">{f.formName}</td>
                    <td className="px-4 py-3 text-right text-ink-primary">{fieldCount}</td>
                    <td className="px-4 py-3 text-right text-ink-secondary">{f.responseCount ?? 0}</td>
                    <td className="px-4 py-3 text-right text-ink-secondary">
                      {f.avgDurationMin != null ? `${f.avgDurationMin}m` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {f.templatePdfUrl ? (
                        <a
                          href={f.templatePdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-status-info-fg hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          {f.templatePdfName ?? "View"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-ink-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          f.isActive
                            ? "bg-mint-50 text-status-success-fg"
                            : "bg-ink-100 text-ink-secondary"
                        }`}
                      >
                        {f.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(f)}
                        disabled={loadingId === f.id || !f.companyId}
                        className="h-7 text-xs"
                      >
                        {loadingId === f.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClone(f)}
                        disabled={cloningId === f.id || !f.companyId}
                        className="h-7 text-xs"
                      >
                        {cloningId === f.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Clone
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(f.id, f.isActive)}
                        disabled={isPending}
                        className="h-7 text-xs"
                      >
                        {f.isActive ? (
                          <>
                            <ToggleRight className="h-3 w-3 mr-1" /> Disable
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3 w-3 mr-1" /> Enable
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(f)}
                        disabled={deletingId === f.id}
                        className="h-7 text-xs text-status-danger-fg hover:bg-critical-50"
                        title="Delete form (only allowed if no completed reviews use it)"
                      >
                        {deletingId === f.id ? (
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

      {showBuilder && (
        <FormBuilderModal
          open={showBuilder}
          onOpenChange={(o) => {
            setShowBuilder(o);
            if (!o) {
              setEditing(null);
              setPrefill(null);
            }
          }}
          companyId={builderCompanyId}
          companyName={builderCompanyName}
          companies={companies}
          editForm={editing ?? undefined}
          prefill={prefill ?? undefined}
          onCreated={() => {
            setShowBuilder(false);
            setEditing(null);
            setPrefill(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}
