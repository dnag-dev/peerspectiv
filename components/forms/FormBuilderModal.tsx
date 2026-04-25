"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Upload, FileText, Copy, Sparkles, X } from "lucide-react";

export interface BuiltFormField {
  field_key: string;
  field_label: string;
  field_type: "yes_no" | "rating" | "text";
  is_required: boolean;
  display_order: number;
}

export interface CreatedForm {
  id: string;
  form_name: string;
  specialty: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  defaultSpecialty?: string;
  onCreated: (form: CreatedForm) => void;
}

type Mode = "upload" | "clone" | "scratch";

const BLANK_FIELDS: BuiltFormField[] = [
  { field_key: "documentation_complete", field_label: "Was documentation complete?", field_type: "yes_no", is_required: true, display_order: 0 },
  { field_key: "overall_quality", field_label: "Overall quality rating", field_type: "rating", is_required: true, display_order: 1 },
  { field_key: "narrative_final", field_label: "Review narrative", field_type: "text", is_required: true, display_order: 2 },
];

export function FormBuilderModal({ open, onOpenChange, companyId, defaultSpecialty, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>("scratch");
  const [formName, setFormName] = useState("");
  const [specialty, setSpecialty] = useState(defaultSpecialty || "Family Medicine");
  const [fields, setFields] = useState<BuiltFormField[]>(BLANK_FIELDS);
  const [templates, setTemplates] = useState<Array<{ id: string; form_name: string; specialty: string }>>([]);
  const [templatePdfUrl, setTemplatePdfUrl] = useState<string | null>(null);
  const [templatePdfName, setTemplatePdfName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFormName("");
    setSpecialty(defaultSpecialty || "Family Medicine");
    setFields(BLANK_FIELDS);
    setTemplatePdfUrl(null);
    setTemplatePdfName(null);
    setMode("scratch");
    fetch(`/api/company-forms?company_id=${companyId}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.forms ?? []))
      .catch(() => setTemplates([]));
  }, [open, companyId, defaultSpecialty]);

  async function cloneFrom(formId: string) {
    if (!formId) return;
    try {
      const r = await fetch(`/api/company-forms/${formId}`);
      const d = await r.json();
      if (Array.isArray(d.form?.form_fields)) {
        setFields((d.form.form_fields as BuiltFormField[]).map((f, idx) => ({ ...f, display_order: idx })));
        setSpecialty(d.form.specialty ?? specialty);
      }
    } catch { /* swallow */ }
  }

  async function handleFileSelected(file: File) {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("company_id", companyId);
      const res = await fetch("/api/upload/form-template", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }
      const d = await res.json();
      setTemplatePdfUrl(d.url);
      setTemplatePdfName(d.name);
      if (!formName) setFormName(file.name.replace(/\.pdf$/i, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function addField() {
    setFields((prev) => [...prev, { field_key: `field_${prev.length + 1}`, field_label: "New question", field_type: "yes_no", is_required: false, display_order: prev.length }]);
  }
  function removeField(idx: number) { setFields((prev) => prev.filter((_, i) => i !== idx)); }
  function updateField(idx: number, patch: Partial<BuiltFormField>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  async function handleSave() {
    setError(null);
    if (!formName.trim()) { setError("Form name is required"); return; }
    if (mode === "upload" && !templatePdfUrl) { setError("Upload a PDF template first"); return; }
    if (fields.length === 0) { setError("Add at least one field"); return; }
    if (fields.some((f) => !f.field_label.trim())) { setError("Every field needs a label"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/company-forms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          specialty,
          form_name: formName.trim(),
          form_fields: fields.map((f, idx) => ({ ...f, display_order: idx })),
          template_pdf_url: templatePdfUrl,
          template_pdf_name: templatePdfName,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create form");
      }
      const d = await res.json();
      onCreated({ id: d.form.id, form_name: d.form.form_name, specialty: d.form.specialty });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create form");
    } finally {
      setSubmitting(false);
    }
  }

  const tabBtn = (m: Mode, icon: React.ReactNode, label: string, sub: string) => (
    <button
      onClick={() => setMode(m)}
      className={`flex flex-1 flex-col items-start gap-1 rounded-md border p-3 text-left transition ${
        mode === m ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">{icon}{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New approved form</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode selector */}
          <div className="flex gap-2">
            {tabBtn("upload", <Upload className="h-4 w-4" />, "Upload PDF", "Use existing PDF template")}
            {tabBtn("clone", <Copy className="h-4 w-4" />, "Clone existing", "Start from a current form")}
            {tabBtn("scratch", <Sparkles className="h-4 w-4" />, "From scratch", "Build a new form")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Form name</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Hunter Health FM 2026"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Specialty</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option>Family Medicine</option>
                <option>Internal Medicine</option>
                <option>Pediatrics</option>
                <option>OB/GYN</option>
                <option>Behavioral Health</option>
                <option>Dental</option>
              </select>
            </div>
          </div>

          {/* Upload PDF mode */}
          {mode === "upload" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">PDF template</label>
              {!templatePdfUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-border p-6 text-center hover:bg-muted/50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-mint-600" />
                      <span className="text-xs text-muted-foreground">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Click to upload PDF</span>
                      <span className="text-xs text-muted-foreground">Up to 20MB</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{templatePdfName}</span>
                  </div>
                  <button
                    onClick={() => { setTemplatePdfUrl(null); setTemplatePdfName(null); }}
                    className="rounded p-1 text-muted-foreground hover:bg-critical-100 hover:text-critical-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Reviewers will see the PDF alongside the questions below.
              </p>
            </div>
          )}

          {/* Clone mode */}
          {mode === "clone" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start from existing form</label>
              {templates.length === 0 ? (
                <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  No existing forms for this client yet.
                </div>
              ) : (
                <select
                  onChange={(e) => cloneFrom(e.target.value)}
                  defaultValue=""
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Select a form to clone —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.form_name} ({t.specialty})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Fields editor (shown in all modes) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Fields</label>
              <Button size="sm" variant="outline" onClick={addField}>
                <Plus className="mr-1 h-3 w-3" /> Add field
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                  <div className="grid flex-1 grid-cols-12 gap-2">
                    <input
                      value={f.field_label}
                      onChange={(e) => updateField(i, { field_label: e.target.value })}
                      placeholder="Field label"
                      className="col-span-7 rounded border px-2 py-1.5 text-sm"
                    />
                    <select
                      value={f.field_type}
                      onChange={(e) => updateField(i, { field_type: e.target.value as BuiltFormField["field_type"] })}
                      className="col-span-3 rounded border bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="yes_no">Yes / No</option>
                      <option value="rating">Rating 0-100</option>
                      <option value="text">Text</option>
                    </select>
                    <label className="col-span-2 flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={f.is_required}
                        onChange={(e) => updateField(i, { is_required: e.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                  <button
                    onClick={() => removeField(i)}
                    className="rounded p-1 text-muted-foreground hover:bg-critical-100 hover:text-critical-600"
                    title="Remove field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-critical-600 bg-critical-100 px-3 py-2 text-xs text-critical-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={submitting || uploading}>
            {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Create form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
