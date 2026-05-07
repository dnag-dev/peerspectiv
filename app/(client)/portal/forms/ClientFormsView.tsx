"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Pencil, Copy, Loader2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { FormBuilderModal } from "@/components/forms/FormBuilderModal";

interface FormRow {
  id: string;
  formName: string;
  specialty: string;
  isActive: boolean | null;
  formFields: unknown;
  formIdentifier?: string | null;
}

interface Props {
  forms: FormRow[];
  companyId: string;
  companyName: string;
}

export function ClientFormsView({ forms, companyId, companyName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<{
    id: string;
    form_name: string;
    form_identifier?: string | null;
    specialty: string;
    form_fields: any[];
  } | null>(null);
  const [prefill, setPrefill] = useState<{
    form_name: string;
    form_identifier?: string | null;
    specialty: string;
    form_fields: any[];
  } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function openEdit(f: FormRow) {
    setLoadingId(f.id);
    try {
      const res = await fetch(`/api/company-forms/${f.id}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setPrefill(null);
      setEditing({
        id: f.id,
        form_name: j.form.form_name,
        form_identifier: j.form.form_identifier ?? null,
        specialty: j.form.specialty,
        form_fields: Array.isArray(j.form.form_fields) ? j.form.form_fields : [],
      });
      setShowBuilder(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleClone(f: FormRow) {
    setLoadingId(f.id);
    try {
      const res = await fetch(`/api/company-forms/${f.id}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setEditing(null);
      setPrefill({
        form_name: `${f.formName} (Copy)`,
        form_identifier: j.form.form_identifier ? `${j.form.form_identifier} (Copy)` : null,
        specialty: f.specialty,
        form_fields: Array.isArray(j.form.form_fields) ? j.form.form_fields : [],
      });
      setShowBuilder(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleToggleActive(formId: string, currentActive: boolean | null) {
    const res = await fetch(`/api/company-forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentActive }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(form: FormRow) {
    if (!confirm(`Delete "${form.formName}"? This cannot be undone.`)) return;
    setLoadingId(form.id);
    try {
      const res = await fetch(`/api/company-forms/${form.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Delete failed");
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink-primary">Forms</h1>
          <p className="text-sm text-ink-secondary">
            Review form templates for your practice — {forms.length} forms.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setPrefill(null); setShowBuilder(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-ink-primary">No forms configured</h3>
          <p className="mt-1 text-sm text-ink-secondary">
            Click &ldquo;New Form&rdquo; to create your first review form.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-gray-50 text-left">
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Form Name</th>
                <th className="px-4 py-3">Specialty</th>
                <th className="px-4 py-3 text-center">Questions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => {
                const fieldCount = Array.isArray(form.formFields) ? form.formFields.length : 0;
                return (
                  <tr key={form.id} className="border-b border-border-subtle hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/portal/forms/${form.id}`}
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <FileText className="h-4 w-4 text-gray-400" />
                        {form.formName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{form.specialty}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{fieldCount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={form.isActive ? "success" : "secondary"}>
                        {form.isActive ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => openEdit(form)}
                          disabled={loadingId === form.id}
                          className="rounded border border-border-subtle px-2 py-0.5 text-xs hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                        >
                          {loadingId === form.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Pencil className="h-3 w-3 mr-1 inline" />Edit</>}
                        </button>
                        <button
                          onClick={() => handleClone(form)}
                          disabled={loadingId === form.id}
                          className="rounded border border-border-subtle px-2 py-0.5 text-xs hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                        >
                          <Copy className="h-3 w-3 mr-1 inline" />Clone
                        </button>
                        <button
                          onClick={() => handleToggleActive(form.id, form.isActive)}
                          disabled={isPending}
                          className="rounded border border-border-subtle px-2 py-0.5 text-xs hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                        >
                          {form.isActive ? (
                            <><ToggleRight className="h-3 w-3 mr-1 inline" />Disable</>
                          ) : (
                            <><ToggleLeft className="h-3 w-3 mr-1 inline" />Enable</>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(form)}
                          disabled={loadingId === form.id}
                          className="rounded border border-border-subtle px-2 py-0.5 text-xs text-red-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3 inline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showBuilder && (
        <FormBuilderModal
          open={showBuilder}
          onOpenChange={(o) => {
            setShowBuilder(o);
            if (!o) { setEditing(null); setPrefill(null); }
          }}
          companyId={companyId}
          companyName={companyName}
          clientMode
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
    </>
  );
}
