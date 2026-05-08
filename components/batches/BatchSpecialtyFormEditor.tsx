"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, FileText, Pencil, Check, Loader2, Plus } from "lucide-react";
import { FormBuilderModal } from "@/components/forms/FormBuilderModal";

interface Props {
  batchId: string;
  companyId: string;
  currentSpecialty: string;
  currentFormId: string | null;
  currentFormName: string | null;
}

interface CompanyForm {
  id: string;
  form_name: string;
  specialty: string;
}

export function BatchSpecialtyFormEditor({
  batchId,
  companyId,
  currentSpecialty,
  currentFormId,
  currentFormName,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(currentSpecialty);
  const [forms, setForms] = useState<CompanyForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>(currentFormId ?? "");
  const [loadingForms, setLoadingForms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  // Load specialties when editing starts
  useEffect(() => {
    if (!editing) return;
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((d) => setSpecialties(d.data ?? []))
      .catch(() => setSpecialties([]));
  }, [editing]);

  // Load forms whenever specialty changes while editing
  useEffect(() => {
    if (!editing || !selectedSpecialty) {
      setForms([]);
      return;
    }
    setLoadingForms(true);
    fetch(`/api/company-forms?company_id=${companyId}&specialty=${encodeURIComponent(selectedSpecialty)}`)
      .then((r) => r.json())
      .then((d) => {
        const list: CompanyForm[] = d.forms ?? [];
        setForms(list);
        // Auto-select if only one form, or clear if specialty changed
        if (list.length === 1) {
          setSelectedFormId(list[0].id);
        } else if (selectedSpecialty !== currentSpecialty) {
          // Specialty changed — don't keep the old form selected
          setSelectedFormId("");
        }
      })
      .catch(() => setForms([]))
      .finally(() => setLoadingForms(false));
  }, [editing, selectedSpecialty, companyId, currentSpecialty]);

  function handleCancel() {
    setEditing(false);
    setSelectedSpecialty(currentSpecialty);
    setSelectedFormId(currentFormId ?? "");
    setError(null);
  }

  async function handleSave() {
    const specialtyChanged = selectedSpecialty !== currentSpecialty;
    const formChanged = selectedFormId !== (currentFormId ?? "");

    if (!specialtyChanged && !formChanged) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (specialtyChanged && selectedSpecialty) body.specialty = selectedSpecialty;
      if (formChanged && selectedFormId) body.company_form_id = selectedFormId;

      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-5 w-5" /> Specialty &amp; Review Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Specialty:</span>
                  <span className="text-sm font-medium">{currentSpecialty || <span className="italic text-muted-foreground">Not set</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Form:</span>
                  <span className="text-sm font-medium flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {currentFormName || <span className="italic text-muted-foreground">None attached</span>}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Specialty picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Specialty</label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select specialty...</option>
                  {specialties.length === 0 && currentSpecialty && (
                    <option value={currentSpecialty}>{currentSpecialty}</option>
                  )}
                  {specialties.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Form picker — shows when specialty is selected */}
              {selectedSpecialty && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Review Form</label>
                  {loadingForms ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading forms...
                    </div>
                  ) : forms.length === 0 ? (
                    <div className="mt-1 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No active forms for {selectedSpecialty}.
                      </p>
                      <button
                        type="button"
                        onClick={() => setBuilderOpen(true)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Create a form
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1.5">
                      {forms.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFormId(f.id)}
                          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                            selectedFormId === f.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{f.form_name}</span>
                          </div>
                          {selectedFormId === f.id && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBuilderOpen(true)}
                        className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Plus className="h-4 w-4" /> Add new form
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !selectedSpecialty}>
                  {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FormBuilderModal
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        companyId={companyId}
        defaultSpecialty={selectedSpecialty}
        onCreated={(form) => {
          setForms((prev) => [...prev, { id: form.id, form_name: form.form_name, specialty: form.specialty }]);
          setSelectedFormId(form.id);
        }}
      />
    </>
  );
}
