"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Pencil, Plus, Check, Loader2 } from "lucide-react";
import { FormBuilderModal } from "@/components/forms/FormBuilderModal";

interface Props {
  batchId: string;
  companyId: string;
  specialty: string;
  currentFormId: string | null;
  currentFormName: string | null;
}

interface CompanyForm {
  id: string;
  form_name: string;
  specialty: string;
  is_active: boolean;
}

export function BatchFormSection({
  batchId,
  companyId,
  specialty,
  currentFormId,
  currentFormName,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [forms, setForms] = useState<CompanyForm[]>([]);
  const [selected, setSelected] = useState<string>(currentFormId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    if (!editing) return;
    fetch(`/api/company-forms?company_id=${companyId}&specialty=${encodeURIComponent(specialty)}`)
      .then((r) => r.json())
      .then((d) => setForms(d.forms ?? []))
      .catch(() => setForms([]));
  }, [editing, companyId, specialty]);

  async function handleSave() {
    if (!selected || selected === currentFormId) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_form_id: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update form");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update form");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" /> Attached review form
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {currentFormName || <span className="italic text-muted-foreground">None attached</span>}
                </p>
                <p className="text-xs text-muted-foreground">Specialty: {specialty}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3 w-3" /> Change form
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {forms.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelected(f.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                      selected === f.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{f.form_name}</div>
                      <div className="text-xs text-muted-foreground">{f.specialty}</div>
                    </div>
                    {selected === f.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBuilderOpen(true)}
                  className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Plus className="h-4 w-4" /> Add new form for this client
                </button>
              </div>
              {error && (
                <div className="rounded-md border border-critical-600 bg-critical-100 px-3 py-2 text-xs text-critical-700">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setSelected(currentFormId ?? ""); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !selected}>
                  {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
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
        defaultSpecialty={specialty}
        onCreated={(form) => {
          setForms((prev) => [...prev, { id: form.id, form_name: form.form_name, specialty: form.specialty, is_active: true }]);
          setSelected(form.id);
        }}
      />
    </>
  );
}
