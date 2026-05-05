"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Upload, FileText, Copy, Sparkles, X } from "lucide-react";

export interface BuiltFormField {
  field_key: string;
  field_label: string;
  /** Per-question option set (SA-044): yes_no_na, abc_na, or text. Legacy 'yes_no'/'rating' mapped on read. */
  field_type: "yes_no_na" | "abc_na" | "text" | "yes_no" | "rating";
  is_required: boolean;
  display_order: number;
  allow_na?: boolean;
  default_value?: "yes" | "no" | "na" | null;
  required_text_on_non_default?: boolean;
  ops_term?: string | null;
  /** Per-question default answer. Options depend on field_type:
   *   yes_no_na → 'yes' | 'no' | 'na'
   *   abc_na    → 'A' | 'B' | 'C' | 'na'
   *   text      → null (no default)
   */
  default_answer?: "yes" | "no" | "na" | "A" | "B" | "C" | null;
  is_critical?: boolean;
}

/** @deprecated Scoring is now per-question via field_type, not per-form. Kept for backward compat. */
export type ScoringSystem = "yes_no_na" | "abc_na" | "pass_fail";

/** Normalize legacy field_type values and fill defaults for old rows. */
export function withFieldDefaults(f: BuiltFormField): BuiltFormField {
  // Map legacy types to new per-question option sets
  let fieldType = f.field_type;
  if (fieldType === 'yes_no') fieldType = 'yes_no_na';
  if (fieldType === 'rating') fieldType = 'yes_no_na';
  return {
    ...f,
    field_type: fieldType,
    allow_na: f.allow_na ?? false,
    default_value: f.default_value ?? null,
    required_text_on_non_default: f.required_text_on_non_default ?? false,
    ops_term: f.ops_term ?? null,
    default_answer: f.default_answer ?? null,
  };
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
  /** When provided, the modal opens in edit mode and PATCHes this form. */
  editForm?: {
    id: string;
    form_name: string;
    specialty: string;
    form_fields: BuiltFormField[];
    allow_ai_generated_recommendations?: boolean;
    scoring_system?: ScoringSystem;
    pass_fail_threshold?: { fail_if_any_critical_no?: boolean } | null;
  };
  /** When provided (and editForm is not), opens in create mode with these values prefilled (used by Clone). */
  prefill?: {
    form_name: string;
    specialty: string;
    form_fields: BuiltFormField[];
    allow_ai_generated_recommendations?: boolean;
    scoring_system?: ScoringSystem;
    pass_fail_threshold?: { fail_if_any_critical_no?: boolean } | null;
  };
}

type Mode = "upload" | "clone" | "scratch";

const BLANK_FIELDS: BuiltFormField[] = [
  { field_key: "documentation_complete", field_label: "Was documentation complete?", field_type: "yes_no_na", is_required: true, display_order: 0 },
  { field_key: "comments_and_recommendations", field_label: "Comments and Recommendations", field_type: "text", is_required: false, display_order: 1 },
];

export function FormBuilderModal({ open, onOpenChange, companyId, defaultSpecialty, onCreated, editForm, prefill }: Props) {
  const isEdit = !!editForm;
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
  const [allowAiNarrative, setAllowAiNarrative] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTemplatePdfUrl(null);
    setTemplatePdfName(null);
    if (editForm) {
      setFormName(editForm.form_name);
      setSpecialty(editForm.specialty);
      setFields(
        (editForm.form_fields ?? []).map((f, idx) => ({
          ...withFieldDefaults(f),
          display_order: idx,
        }))
      );
      setAllowAiNarrative(!!editForm.allow_ai_generated_recommendations);
      setMode("scratch");
    } else if (prefill) {
      setFormName(prefill.form_name);
      setSpecialty(prefill.specialty);
      setFields(
        (prefill.form_fields ?? []).map((f, idx) => ({
          ...withFieldDefaults(f),
          display_order: idx,
        }))
      );
      setAllowAiNarrative(!!prefill.allow_ai_generated_recommendations);
      setMode("scratch");
    } else {
      setFormName("");
      setSpecialty(defaultSpecialty || "Family Medicine");
      setFields(BLANK_FIELDS);
      setAllowAiNarrative(false);
      setMode("scratch");
    }
    fetch(`/api/company-forms?company_id=${companyId}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.forms ?? []))
      .catch(() => setTemplates([]));
  }, [open, companyId, defaultSpecialty, editForm, prefill]);

  async function cloneFrom(formId: string) {
    if (!formId) return;
    try {
      const r = await fetch(`/api/company-forms/${formId}`);
      const d = await r.json();
      if (Array.isArray(d.form?.form_fields)) {
        setFields(
          (d.form.form_fields as BuiltFormField[]).map((f, idx) => ({
            ...withFieldDefaults(f),
            display_order: idx,
          }))
        );
        setSpecialty(d.form.specialty ?? specialty);
        if (typeof d.form.allow_ai_generated_recommendations === "boolean") {
          setAllowAiNarrative(d.form.allow_ai_generated_recommendations);
        }
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

  async function draftWithAi() {
    setError(null);
    if (!specialty) {
      setError("Pick a specialty first.");
      return;
    }
    setAiDrafting(true);
    try {
      const res = await fetch("/api/forms/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialty,
          form_name: formName || `${specialty} Peer Review`,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `AI draft failed (${res.status})`);
      const drafted: BuiltFormField[] = (j.data?.form_fields ?? []).map(
        (f: BuiltFormField, idx: number) => ({
          ...withFieldDefaults(f),
          display_order: idx,
        })
      );
      if (drafted.length === 0) {
        setError("AI returned no fields. Try again or build from scratch.");
        return;
      }
      setFields(drafted);
      if (!formName) setFormName(`${specialty} Peer Review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setAiDrafting(false);
    }
  }

  function addField() {
    setFields((prev) => [...prev, { field_key: `field_${prev.length + 1}`, field_label: "New question", field_type: "yes_no_na", is_required: false, display_order: prev.length }]);
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
      const url = isEdit ? `/api/company-forms/${editForm!.id}` : "/api/company-forms/create";
      const method = isEdit ? "PATCH" : "POST";
      const normalizedFields = fields.map((f, idx) => {
        const cleaned: BuiltFormField = {
          field_key: f.field_key,
          field_label: f.field_label,
          field_type: f.field_type,
          is_required: f.is_required,
          display_order: idx,
        };
        if (f.field_type === "yes_no_na") {
          if (f.required_text_on_non_default) cleaned.required_text_on_non_default = true;
          if (f.default_answer) cleaned.default_answer = f.default_answer;
        }
        if (f.field_type === "abc_na") {
          if (f.default_answer) cleaned.default_answer = f.default_answer;
        }
        return cleaned;
      });
      const payload = isEdit
        ? {
            specialty,
            form_name: formName.trim(),
            form_fields: normalizedFields,
            allow_ai_generated_recommendations: allowAiNarrative,
          }
        : {
            company_id: companyId,
            specialty,
            form_name: formName.trim(),
            form_fields: normalizedFields,
            template_pdf_url: templatePdfUrl,
            template_pdf_name: templatePdfName,
            allow_ai_generated_recommendations: allowAiNarrative,
          };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || (isEdit ? "Failed to save form" : "Failed to create form"));
      }
      const d = await res.json();
      onCreated({ id: d.form.id, form_name: d.form.form_name, specialty: d.form.specialty });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEdit ? "Failed to save form" : "Failed to create form"));
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
          <DialogTitle>{isEdit ? "Edit form" : "New approved form"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode selector — hidden in edit mode */}
          {!isEdit && (
            <div className="flex gap-2">
              {tabBtn("upload", <Upload className="h-4 w-4" />, "Upload PDF", "Use existing PDF template")}
              {tabBtn("clone", <Copy className="h-4 w-4" />, "Clone existing", "Start from a current form")}
              {tabBtn("scratch", <Sparkles className="h-4 w-4" />, "From scratch", "Build a new form")}
            </div>
          )}

          <label className="flex items-center gap-2 rounded-md border border-cobalt-100 bg-cobalt-50/40 px-3 py-2 text-xs text-ink-700">
            <input
              type="checkbox"
              checked={allowAiNarrative}
              onChange={(e) => setAllowAiNarrative(e.target.checked)}
            />
            <span>
              <strong className="font-medium text-ink-900">Allow peer to use AI-drafted narrative</strong>
              <span className="ml-1 text-ink-500">— shows a &ldquo;Generate AI suggestion&rdquo; button next to the comments box.</span>
            </span>
          </label>

          {/* Draft with AI */}
          <div className="flex items-center justify-between rounded-md border border-cobalt-100 bg-cobalt-50/40 px-3 py-2">
            <div className="text-xs text-ink-700">
              <strong className="text-ink-900">Draft form with AI</strong> — generates
              10–20 questions appropriate for the chosen specialty.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={draftWithAi}
              disabled={aiDrafting || !specialty}
            >
              {aiDrafting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {aiDrafting ? "Drafting…" : "Draft with AI"}
            </Button>
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
                      <Loader2 className="h-5 w-5 animate-spin text-cobalt-600" />
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
                Peers will see the PDF alongside the questions below.
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
              {fields.map((f, i) => {
                const isYesNoNa = f.field_type === "yes_no_na" || f.field_type === "yes_no";
                const isAbcNa = f.field_type === "abc_na";
                const isMultipleChoice = isYesNoNa || isAbcNa;
                return (
                  <div key={i} className="rounded-md border p-2">
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 grid-cols-12 gap-2">
                        <input
                          value={f.field_label}
                          onChange={(e) => updateField(i, { field_label: e.target.value })}
                          placeholder="Question text"
                          className="col-span-7 rounded border px-2 py-1.5 text-sm"
                        />
                        <select
                          value={isYesNoNa ? "yes_no_na" : f.field_type}
                          onChange={(e) => {
                            const newType = e.target.value as BuiltFormField["field_type"];
                            const patch: Partial<BuiltFormField> = { field_type: newType };
                            // Clear metadata that doesn't apply to the new type
                            if (newType === "text") {
                              patch.default_answer = null;
                              patch.required_text_on_non_default = false;
                            } else if (newType === "abc_na" && (f.default_answer === "yes" || f.default_answer === "no")) {
                              patch.default_answer = null;
                            } else if (newType === "yes_no_na" && (f.default_answer === "A" || f.default_answer === "B" || f.default_answer === "C")) {
                              patch.default_answer = null;
                            }
                            updateField(i, patch);
                          }}
                          className="col-span-3 rounded border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="yes_no_na">Yes / No / NA</option>
                          <option value="abc_na">A / B / C / NA</option>
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
                    {/* Per-question options — SA-044 */}
                    {isMultipleChoice && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 text-xs text-ink-700">
                        <label className="flex items-center gap-1">
                          <span>Default answer</span>
                          <select
                            value={f.default_answer ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateField(i, {
                                default_answer: v === "" ? null : (v as BuiltFormField["default_answer"]),
                              });
                            }}
                            className="rounded border bg-background px-1.5 py-0.5 text-xs"
                          >
                            <option value="">None</option>
                            {isYesNoNa && (
                              <>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                                <option value="na">NA</option>
                              </>
                            )}
                            {isAbcNa && (
                              <>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="na">NA</option>
                              </>
                            )}
                          </select>
                        </label>
                        {isYesNoNa && (
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={!!f.required_text_on_non_default}
                              onChange={(e) =>
                                updateField(i, { required_text_on_non_default: e.target.checked })
                              }
                            />
                            Require additional response if No
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
            {isEdit ? "Save changes" : "Create form"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
