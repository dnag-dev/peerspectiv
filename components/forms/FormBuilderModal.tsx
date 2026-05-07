"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Upload, FileText, Copy, Sparkles, X, ChevronUp, ChevronDown } from "lucide-react";

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

interface CompanyOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  defaultSpecialty?: string;
  onCreated: (form: CreatedForm) => void;
  companyName?: string;
  /** List of companies for the company picker (create mode). If omitted, company is fixed to companyId. */
  companies?: CompanyOption[];
  /** When provided, the modal opens in edit mode and PATCHes this form. */
  editForm?: {
    id: string;
    form_name: string;
    form_identifier?: string | null;
    specialty: string;
    form_fields: BuiltFormField[];
    allow_ai_generated_recommendations?: boolean;
  };
  /** When provided (and editForm is not), opens in create mode with these values prefilled (used by Clone). */
  prefill?: {
    form_name: string;
    form_identifier?: string | null;
    specialty: string;
    form_fields: BuiltFormField[];
    allow_ai_generated_recommendations?: boolean;
  };
}

type Mode = "upload" | "clone" | "scratch";

const BLANK_FIELDS: BuiltFormField[] = [
  { field_key: "documentation_complete", field_label: "Was documentation complete?", field_type: "yes_no_na", is_required: true, display_order: 0 },
  { field_key: "comments_and_recommendations", field_label: "Comments and Recommendations", field_type: "text", is_required: false, display_order: 1 },
];

export function FormBuilderModal({ open, onOpenChange, companyId, companyName, companies: companiesProp, defaultSpecialty, onCreated, editForm, prefill }: Props) {
  const isEdit = !!editForm;
  const [mode, setMode] = useState<Mode>("scratch");
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId);
  const [formIdentifier, setFormIdentifier] = useState("");
  const [specialty, setSpecialty] = useState(defaultSpecialty || "Family Medicine");
  const selectedCompanyName = companiesProp?.find((c) => c.id === selectedCompanyId)?.name || companyName || "";
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
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
    setSelectedCompanyId(companyId);
    if (editForm) {
      setFormIdentifier(editForm.form_identifier || editForm.form_name || "");
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
      setFormIdentifier(prefill.form_identifier || prefill.form_name || "");
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
      setFormIdentifier("");
      setSpecialty(defaultSpecialty || "Family Medicine");
      setFields(BLANK_FIELDS);
      setAllowAiNarrative(false);
      setMode("scratch");
    }
    // Fetch specialty taxonomy
    fetch('/api/specialties')
      .then((r) => r.json())
      .then((d) => setSpecialtyOptions((d.data ?? []).map((s: { name: string }) => s.name)))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId, defaultSpecialty, editForm, prefill]);

  // Fetch clone templates when company selection changes
  useEffect(() => {
    if (!open) return;
    const cid = selectedCompanyId || companyId;
    if (!cid) { setTemplates([]); return; }
    fetch(`/api/company-forms?company_id=${cid}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.forms ?? []))
      .catch(() => setTemplates([]));
  }, [open, selectedCompanyId, companyId]);

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
      if (!formIdentifier) setFormIdentifier(file.name.replace(/\.pdf$/i, ""));
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
          form_name: formIdentifier || `${specialty} Peer Review`,
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
      if (!formIdentifier) setFormIdentifier("Peer Review Form v1");
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
  function moveField(idx: number, dir: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    if (!selectedCompanyId && !companyId) { setError("Please select a company"); return; }
    if (!formIdentifier.trim()) { setError("Form identifier is required"); return; }
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
            form_identifier: formIdentifier.trim(),
            form_fields: normalizedFields,
            allow_ai_generated_recommendations: allowAiNarrative,
          }
        : {
            company_id: selectedCompanyId || companyId,
            specialty,
            form_identifier: formIdentifier.trim(),
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

          <label className="flex items-center gap-2 rounded-md border border-status-info-bg bg-status-info-bg/40 px-3 py-2 text-xs text-ink-primary">
            <input
              type="checkbox"
              checked={allowAiNarrative}
              onChange={(e) => setAllowAiNarrative(e.target.checked)}
            />
            <span>
              <strong className="font-medium text-ink-primary">Allow peer to use AI-drafted narrative</strong>
              <span className="ml-1 text-ink-secondary">— shows a &ldquo;Generate AI suggestion&rdquo; button next to the comments box.</span>
            </span>
          </label>

          {/* Draft with AI */}
          <div className="flex items-center justify-between rounded-md border border-status-info-bg bg-status-info-bg/40 px-3 py-2">
            <div className="text-xs text-ink-primary">
              <strong className="text-ink-primary">Draft form with AI</strong> — generates
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

          {/* Company — editable dropdown in create mode, read-only in edit mode */}
          {isEdit ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <div className="mt-1 w-full rounded-md border bg-muted/50 px-3 py-2 text-sm">{selectedCompanyName || companyName || '—'}</div>
            </div>
          ) : companiesProp && companiesProp.length > 0 ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company *</label>
              <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companiesProp.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Specialty</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specialtyOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Form Identifier</label>
              <input
                value={formIdentifier}
                onChange={(e) => setFormIdentifier(e.target.value)}
                placeholder="e.g. Peer Review Form v1"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
          {formIdentifier.trim() && selectedCompanyName && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">Form Name: </span>
              <span className="text-sm font-medium">{selectedCompanyName} - {specialty} - {formIdentifier.trim()}</span>
            </div>
          )}

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
                      <Loader2 className="h-5 w-5 animate-spin text-status-info-dot" />
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
                    className="rounded p-1 text-muted-foreground hover:bg-critical-100 hover:text-status-danger-dot"
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
                <Select onValueChange={(v) => cloneFrom(v)}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select a form to clone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.form_name} ({t.specialty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveField(i, -1)}
                          disabled={i === 0}
                          className="rounded p-0.5 text-muted-foreground hover:bg-ink-100 disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveField(i, 1)}
                          disabled={i === fields.length - 1}
                          className="rounded p-0.5 text-muted-foreground hover:bg-ink-100 disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeField(i)}
                        className="rounded p-1 text-muted-foreground hover:bg-critical-100 hover:text-status-danger-dot"
                        title="Remove field"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Per-question options — SA-044 */}
                    {isMultipleChoice && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 text-xs text-ink-primary">
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
            <div className="rounded-md border border-status-danger-dot bg-critical-100 px-3 py-2 text-xs text-status-danger-fg">
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
