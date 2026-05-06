"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Check, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormBuilderModal } from "@/components/forms/FormBuilderModal";

export type BatchWizardCompany = {
  id: string;
  name: string;
  billing_cycle?: string | null;
  fiscal_year_start_month?: number | null;
};
export type BatchWizardProvider = {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
};
export type BatchWizardForm = {
  id: string;
  company_id: string;
  specialty: string;
  form_name: string;
  is_active: boolean;
};

// Valid FQHC specialties only — keep in sync with scripts/fix-specialty-seed.mjs
const CORE_SPECIALTIES = [
  "Family Medicine",
  "Internal Medicine",
  "Pediatrics",
  "OB/GYN",
  "Behavioral Health",
  "Dental",
];

/** Parse filename to guess {providerLast, specialty} — best-effort. */
function parseFilename(name: string): { lastName: string | null; specialty: string | null } {
  const base = name.replace(/\.pdf$/i, "");
  const tokens = base.split(/[\s_.\-]+/).filter(Boolean);

  const specialtyHits: Record<string, string> = {
    ob: "OB/GYN",
    obgyn: "OB/GYN",
    gyn: "OB/GYN",
    hiv: "Internal Medicine",
    mental: "Behavioral Health",
    behavioral: "Behavioral Health",
    psych: "Behavioral Health",
    pediatrics: "Pediatrics",
    pediatric: "Pediatrics",
    peds: "Pediatrics",
    family: "Family Medicine",
    fm: "Family Medicine",
    internal: "Internal Medicine",
    im: "Internal Medicine",
    dental: "Dental",
  };

  let specialty: string | null = null;
  for (const t of tokens) {
    const lc = t.toLowerCase();
    if (specialtyHits[lc]) {
      specialty = specialtyHits[lc];
      break;
    }
  }

  // last-name guess: a Capitalized token that isn't a specialty/number/quarter
  let lastName: string | null = null;
  for (const t of tokens) {
    if (/^\d+$/.test(t)) continue;
    if (/^Q\d/i.test(t)) continue;
    if (specialtyHits[t.toLowerCase()]) continue;
    if (t.length < 3) continue;
    if (/^[A-Z][a-z]+$/.test(t) || /^[A-Z]+$/.test(t)) {
      lastName = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      break;
    }
  }

  return { lastName, specialty };
}

interface Row {
  file: File;
  providerId: string;
  encounterDate: string;
  // D6 — only consulted when batch specialty === "Mixed"
  rowSpecialty?: string;
  // D3 — per-row form override (used in Mixed mode, or when multiple forms exist)
  companyFormId?: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
}

/**
 * D2 — Suggest a batch name from billing cycle + the spread of encounter dates.
 * Inline per memory rule (no new utility files).
 *
 *   monthly    → "<Month YYYY>"          (all dates in same calendar month)
 *   quarterly  → "Q<n> YYYY" or "Q<n>-Q<m> YYYY"
 *   semi-annual→ "H1 YYYY" or "H2 YYYY"
 *   annual     → "YYYY"
 *
 *   `fiscalYearStartMonth` reserved for future fiscal-year cycles; quarter math
 *   here is calendar-based which matches what billing cycles mean today.
 */
function suggestBatchName(
  rows: Array<{ encounterDate: string }>,
  billingCycle: string | null | undefined,
  _fiscalYearStartMonth: number | null | undefined
): string {
  const dates: Date[] = [];
  for (const r of rows) {
    if (!r.encounterDate) continue;
    const d = new Date(r.encounterDate);
    if (!isNaN(d.getTime())) dates.push(d);
  }
  if (dates.length === 0) return "";

  const cycle = (billingCycle || "").toLowerCase();
  const years = new Set(dates.map((d) => d.getFullYear()));
  // Mixed-year batches don't get a clean label
  if (years.size > 1 && cycle !== "annual") return "";
  const year = dates[0].getFullYear();

  const months = dates.map((d) => d.getMonth()); // 0..11
  const quarter = (m: number) => Math.floor(m / 3) + 1; // 1..4

  if (cycle === "monthly") {
    const allSame = months.every((m) => m === months[0]);
    if (!allSame) return "";
    const monthName = new Date(year, months[0], 1).toLocaleString("en-US", {
      month: "long",
    });
    return `${monthName} ${year}`;
  }

  if (cycle === "quarterly") {
    const qs = Array.from(new Set(months.map(quarter))).sort((a, b) => a - b);
    if (qs.length === 1) return `Q${qs[0]} ${year}`;
    return `Q${qs[0]}-Q${qs[qs.length - 1]} ${year}`;
  }

  if (cycle === "semi-annual" || cycle === "semiannual") {
    const halves = new Set(months.map((m) => (m < 6 ? 1 : 2)));
    if (halves.size === 1) {
      const h = halves.values().next().value;
      return `H${h} ${year}`;
    }
    return `${year}`;
  }

  if (cycle === "annual") {
    if (years.size === 1) return `${year}`;
    return "";
  }

  return "";
}

export function NewBatchModal({
  companies,
  providers,
  forms,
}: {
  companies: BatchWizardCompany[];
  providers: BatchWizardProvider[];
  forms: BatchWizardForm[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [companyId, setCompanyId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [companyFormId, setCompanyFormId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [localForms, setLocalForms] = useState<BatchWizardForm[]>([]);
  const allForms = useMemo(() => [...forms, ...localForms], [forms, localForms]);

  const companyProviders = useMemo(
    () => providers.filter((p) => p.company_id === companyId),
    [providers, companyId]
  );
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId) ?? null,
    [companies, companyId]
  );
  const specialtyForms = useMemo(
    () => allForms.filter((f) => f.company_id === companyId && f.specialty === specialty),
    [allForms, companyId, specialty]
  );
  // Specialties with an approved form for this client
  const availableSpecialties = useMemo(() => {
    const hasForm = new Set(allForms.filter((f) => f.company_id === companyId).map((f) => f.specialty));
    return CORE_SPECIALTIES.filter((s) => hasForm.has(s));
  }, [allForms, companyId]);
  const isMixed = specialty === "Mixed";

  // D3 — find candidate forms for a given (companyId, specialty)
  function formsFor(spec: string): BatchWizardForm[] {
    return allForms.filter(
      (f) => f.company_id === companyId && f.specialty === spec && f.is_active
    );
  }

  // D2 — auto-fill batch name from billing cycle + encounter dates whenever
  // those inputs change, but only if the user hasn't manually edited it.
  const batchNameTouched = useRef(false);
  const suggestedName = useMemo(
    () =>
      suggestBatchName(
        rows.map((r) => ({ encounterDate: r.encounterDate })),
        selectedCompany?.billing_cycle ?? null,
        selectedCompany?.fiscal_year_start_month ?? null
      ),
    [rows, selectedCompany]
  );
  useEffect(() => {
    if (batchNameTouched.current) return;
    if (suggestedName) setBatchName(suggestedName);
  }, [suggestedName]);

  // Phase 6.6 (CL-017) — when a company is picked, prefill batch name from the
  // company's current cadence period label. Honors the user's manual edits via
  // batchNameTouched. Cadence label takes precedence over suggestBatchName(),
  // because it's the system-of-record for billing-period names.
  useEffect(() => {
    if (!companyId) return;
    if (batchNameTouched.current) return;
    let cancelled = false;
    fetch(`/api/companies/${companyId}/cadence-periods`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        const periods = (j.periods as Array<{ label: string; start_date: string; end_date: string }>) ?? [];
        if (periods.length === 0) return;
        const today = new Date().toISOString().slice(0, 10);
        const current =
          periods.find((p) => p.start_date <= today && today <= p.end_date) ??
          periods[periods.length - 1];
        if (current?.label && !batchNameTouched.current) {
          setBatchName(current.label);
        }
      })
      .catch(() => {
        /* silent — fall back to suggestBatchName */
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function reset() {
    setStep(1);
    setCompanyId("");
    setSpecialty("");
    setCompanyFormId("");
    setBatchName("");
    setRows([]);
    setSubmitting(false);
    setSubmitError(null);
    batchNameTouched.current = false;
  }

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setTimeout(reset, 200);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const pdfs = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    const next: Row[] = pdfs.map((f) => {
      const parsed = parseFilename(f.name);
      // find best provider match within companyProviders
      const match = parsed.lastName
        ? companyProviders.find(
            (p) => p.last_name?.toLowerCase() === parsed.lastName!.toLowerCase()
          )
        : null;
      // D6 — seed per-row specialty from filename guess (Mixed mode only)
      const rowSpec = isMixed
        ? parsed.specialty ?? match?.specialty ?? ""
        : undefined;
      // D3 — auto-attach a row-level form if exactly one matches the row's specialty
      let rowFormId: string | undefined = undefined;
      if (isMixed && rowSpec) {
        const candidates = formsFor(rowSpec);
        if (candidates.length === 1) rowFormId = candidates[0].id;
      }
      return {
        file: f,
        providerId: match?.id ?? companyProviders[0]?.id ?? "",
        encounterDate: "",
        rowSpecialty: rowSpec,
        companyFormId: rowFormId,
        status: "pending",
      };
    });
    setRows((prev) => [...prev, ...next]);
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);

    try {
      if (rows.some((r) => !r.providerId)) {
        throw new Error("Every row needs a provider selected.");
      }

      // 1. Create the batch + cases
      // In Mixed mode, validate every row has a specialty + send per-row.
      if (isMixed) {
        const missing = rows.find((r) => !r.rowSpecialty);
        if (missing) {
          throw new Error("Every row needs a specialty when batch type is Mixed.");
        }
      }

      const createRes = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_name: batchName,
          company_id: companyId,
          specialty: isMixed ? "Mixed" : specialty,
          company_form_id: isMixed ? null : effectiveFormId,
          cases: rows.map((r) => ({
            provider_id: r.providerId,
            specialty_required: isMixed ? r.rowSpecialty! : specialty,
            encounter_date: r.encounterDate || null,
            chart_file_name: r.file.name,
            company_form_id: r.companyFormId ?? null,
          })),
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || "Batch creation failed");
      }

      const {
        data: batch,
        batches: createdBatches,
        cases,
      } = (await createRes.json()) as {
        data: { id: string };
        batches?: Array<{ id: string; batch_name: string }>;
        cases: Array<{
          id: string;
          chart_file_name: string | null;
          provider_id: string | null;
          batch_id?: string | null;
        }>;
      };

      // 2. For each row, match a case by filename and upload PDF
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const match =
          cases.find((c) => c.chart_file_name === row.file.name) ??
          cases[i]; // positional fallback
        if (!match) {
          updateRow(i, { status: "error", errorMsg: "No case match" });
          continue;
        }
        updateRow(i, { status: "uploading" });

        const fd = new FormData();
        fd.append("file", row.file);
        fd.append("case_id", match.id);

        try {
          const up = await fetch("/api/upload/chart", {
            method: "POST",
            body: fd,
          });
          if (!up.ok) {
            const body = await up.json().catch(() => ({}));
            throw new Error(body.error || "Upload failed");
          }
          updateRow(i, { status: "done" });
        } catch (err) {
          updateRow(i, {
            status: "error",
            errorMsg: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }

      // If any rows failed to upload, leave the modal open so the user can
      // see the inline warning banner. Otherwise close + navigate.
      const hasFailures = rows.some((r) => r.status === "error");
      if (hasFailures) {
        setSubmitting(false);
        return;
      }

      // Navigate. For Mixed (split) batches, drop user on the batches index so
      // they can see all the new child batches; otherwise jump straight in.
      const splitCount = createdBatches?.length ?? 1;
      if (isMixed && splitCount > 1) {
        router.push(`/batches`);
      } else {
        router.push(`/batches/${batch.id}`);
      }
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  }

  // Auto-attach: if the chosen (company, specialty) has exactly one approved form,
  // stamp it silently and skip the manual form-picker step.
  // Mixed mode also skips the form step entirely — per-row forms attach later.
  const autoAttachedFormId = specialtyForms.length === 1 ? specialtyForms[0].id : "";
  const effectiveFormId = companyFormId || autoAttachedFormId;
  const skipFormStep = isMixed || specialtyForms.length === 1;

  function goNext() {
    if (step === 2 && skipFormStep) {
      if (!isMixed && !companyFormId) setCompanyFormId(autoAttachedFormId);
      setStep(4);
      return;
    }
    setStep(step + 1);
  }
  function goBack() {
    if (step === 4 && skipFormStep) {
      setStep(2);
      return;
    }
    if (step > 1) setStep(step - 1);
    else handleClose();
  }

  const canNext1 = !!companyId;
  const canNext2 =
    !!specialty &&
    (isMixed || availableSpecialties.includes(specialty));
  const canNext3 = !!effectiveFormId;
  const canNext4 =
    rows.length > 0 &&
    !!batchName.trim() &&
    (!isMixed || rows.every((r) => !!r.rowSpecialty));

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        New Batch
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">New Batch</h2>
                <p className="text-xs text-ink-500">Step {step} of 5</p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 border-b bg-ink-50 px-5 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`h-1 flex-1 rounded-full ${
                    n <= step ? "bg-cobalt-600" : "bg-ink-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* STEP 1 — company */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink-900">
                    Which client is this batch for?
                  </h3>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      setSpecialty("");
                      setCompanyFormId("");
                    }}
                    className="w-full rounded-lg border border-ink-300 px-4 py-3 text-sm focus:border-cobalt-600 focus:outline-none"
                  >
                    <option value="">Select company…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* STEP 2 — specialty */}
              {step === 2 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink-900">Specialty</h3>
                  <p className="text-xs text-ink-500">
                    All charts in this batch must be the same specialty. Only specialties with
                    an approved form for this client are shown.
                  </p>
                  {specialty && skipFormStep && (
                    <p className="rounded-lg border border-mint-200 bg-mint-50 px-3 py-2 text-xs text-cobalt-700">
                      <Check className="mr-1 inline h-3 w-3" />
                      <strong>
                        {specialtyForms[0].form_name}
                      </strong>{" "}
                      will be auto-attached (only approved form for this client + specialty).
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {availableSpecialties.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSpecialty(s);
                          setCompanyFormId("");
                        }}
                        className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                          specialty === s
                            ? "border-cobalt-600 bg-cobalt-100 text-cobalt-600"
                            : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    {/* D6 — Mixed-specialty option. Server splits into one batch per specialty. */}
                    {availableSpecialties.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialty("Mixed");
                          setCompanyFormId("");
                        }}
                        className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                          specialty === "Mixed"
                            ? "border-cobalt-600 bg-cobalt-100 text-cobalt-600"
                            : "border-dashed border-ink-300 bg-white hover:border-cobalt-600 hover:bg-cobalt-50"
                        }`}
                      >
                        Mixed
                        <div className="text-xs font-normal text-ink-500">
                          Multiple specialties — server splits into separate batches
                        </div>
                      </button>
                    )}
                  </div>
                  {availableSpecialties.length === 0 && (
                    <p className="rounded-lg border border-amber-600 bg-amber-100 px-4 py-3 text-xs text-amber-700">
                      No approved forms found for this client. Seed `company_forms` first.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 3 — form */}
              {step === 3 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink-900">
                    Approved review form
                  </h3>
                  <p className="text-xs text-ink-500">
                    This is the form the peer will use. It must be pre-approved by the
                    client.
                  </p>
                  <div className="space-y-2 pt-2">
                    {specialtyForms.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCompanyFormId(f.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          companyFormId === f.id
                            ? "border-cobalt-600 bg-cobalt-100"
                            : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
                        }`}
                      >
                        <div>
                          <div className="font-medium text-ink-900">{f.form_name}</div>
                          <div className="text-xs text-ink-500">
                            Specialty: {f.specialty}
                          </div>
                        </div>
                        {companyFormId === f.id && <Check className="h-4 w-4 text-cobalt-600" />}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormBuilderOpen(true)}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-ink-300 px-4 py-3 text-left text-sm text-ink-600 hover:border-cobalt-600 hover:bg-cobalt-100 hover:text-cobalt-600"
                    >
                      <Plus className="h-4 w-4" />
                      Add new form for this client
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — upload */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink-900">Batch details + charts</h3>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-700">
                      Batch name
                    </label>
                    <input
                      value={batchName}
                      onChange={(e) => {
                        batchNameTouched.current = true;
                        setBatchName(e.target.value);
                      }}
                      placeholder="e.g. Q2 2026 — OB/GYN charts"
                      className="w-full rounded-lg border border-ink-300 px-4 py-2.5 text-sm focus:border-cobalt-600 focus:outline-none"
                    />
                    {batchName && !batchNameTouched.current && (
                      <p className="mt-1 text-xs text-ink-500">
                        Auto-filled from current cadence period. Edit to override.
                      </p>
                    )}
                  </div>

                  <label
                    htmlFor="batch-pdfs"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFiles(e.dataTransfer.files);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 px-6 py-10 text-center hover:border-cobalt-600 hover:bg-cobalt-100"
                  >
                    <Upload className="h-6 w-6 text-ink-400" />
                    <span className="text-sm font-medium text-ink-700">
                      Drop PDFs here or click to browse
                    </span>
                    <span className="text-xs text-ink-500">
                      Each PDF = one case. Filename is used to suggest a provider.
                    </span>
                    <input
                      id="batch-pdfs"
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => handleFiles(e.target.files)}
                      className="hidden"
                    />
                  </label>

                  {rows.length > 0 && (
                    <div className="space-y-2">
                      {rows.map((row, i) => {
                        // D3 — pick the row's effective specialty (Mixed vs single)
                        const rowSpec = isMixed ? row.rowSpecialty || "" : specialty;
                        const rowFormCandidates = rowSpec ? formsFor(rowSpec) : [];
                        const showRowFormPicker =
                          isMixed && rowFormCandidates.length > 1;
                        return (
                          <div
                            key={i}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-ink-900">
                                {row.file.name}
                              </div>
                              <div className="text-xs text-ink-500">
                                {(row.file.size / 1024).toFixed(0)} KB
                              </div>
                            </div>

                            <select
                              value={row.providerId}
                              onChange={(e) =>
                                updateRow(i, { providerId: e.target.value })
                              }
                              className="rounded-md border border-ink-300 px-2 py-1.5 text-xs"
                            >
                              <option value="">Pick provider…</option>
                              {companyProviders.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.first_name} {p.last_name}
                                  {p.specialty ? ` — ${p.specialty}` : ""}
                                </option>
                              ))}
                            </select>

                            <input
                              type="date"
                              value={row.encounterDate}
                              onChange={(e) =>
                                updateRow(i, { encounterDate: e.target.value })
                              }
                              className="rounded-md border border-ink-300 px-2 py-1.5 text-xs"
                              title="Encounter date"
                            />

                            {isMixed && (
                              <select
                                value={row.rowSpecialty || ""}
                                onChange={(e) => {
                                  const newSpec = e.target.value;
                                  // Re-evaluate single-form auto-attach for the new specialty
                                  const candidates = newSpec ? formsFor(newSpec) : [];
                                  updateRow(i, {
                                    rowSpecialty: newSpec,
                                    companyFormId:
                                      candidates.length === 1
                                        ? candidates[0].id
                                        : undefined,
                                  });
                                }}
                                className="rounded-md border border-ink-300 px-2 py-1.5 text-xs"
                              >
                                <option value="">Specialty…</option>
                                {availableSpecialties.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            )}

                            {showRowFormPicker && (
                              <select
                                value={row.companyFormId || ""}
                                onChange={(e) =>
                                  updateRow(i, { companyFormId: e.target.value })
                                }
                                className="rounded-md border border-ink-300 px-2 py-1.5 text-xs"
                                title="Review form"
                              >
                                <option value="">Pick form…</option>
                                {rowFormCandidates.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.form_name}
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              onClick={() => removeRow(i)}
                              className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-critical-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5 — confirm / upload progress */}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink-900">Review and submit</h3>

                  <dl className="space-y-1.5 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Client</dt>
                      <dd className="font-medium text-ink-900">
                        {companies.find((c) => c.id === companyId)?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Specialty</dt>
                      <dd className="font-medium text-ink-900">{specialty}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Form</dt>
                      <dd className="font-medium text-ink-900">
                        {allForms.find((f) => f.id === effectiveFormId)?.form_name}
                        {skipFormStep && (
                          <span className="ml-2 rounded bg-mint-100 px-1.5 py-0.5 text-[10px] font-medium text-cobalt-700">
                            AUTO
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Batch name</dt>
                      <dd className="font-medium text-ink-900">{batchName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Cases</dt>
                      <dd className="font-medium text-ink-900">{rows.length}</dd>
                    </div>
                  </dl>

                  <div className="space-y-1.5">
                    {rows.map((row, i) => {
                      const p = companyProviders.find((pp) => pp.id === row.providerId);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-ink-900">
                              {p ? `${p.first_name} ${p.last_name}` : "Unassigned"}
                            </span>
                            <span className="ml-2 text-ink-500">{row.file.name}</span>
                          </div>
                          <div className="ml-3 flex items-center gap-1.5">
                            {row.status === "pending" && (
                              <span className="text-ink-400">Queued</span>
                            )}
                            {row.status === "uploading" && (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-cobalt-600" />
                                <span className="text-cobalt-600">Uploading…</span>
                              </>
                            )}
                            {row.status === "done" && (
                              <>
                                <Check className="h-3 w-3 text-cobalt-600" />
                                <span className="text-cobalt-600">Uploaded</span>
                              </>
                            )}
                            {row.status === "error" && (
                              <span className="text-critical-600" title={row.errorMsg}>
                                Failed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {submitError && (
                    <div className="rounded-lg border border-critical-600 bg-critical-100 px-3 py-2 text-xs text-critical-700">
                      {submitError}
                    </div>
                  )}

                  {(() => {
                    const failed = rows
                      .map((r, i) => ({ r, i }))
                      .filter((x) => x.r.status === "error");
                    if (failed.length === 0) return null;
                    return (
                      <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <p className="font-medium">
                          Batch created, but {failed.length} chart
                          {failed.length === 1 ? "" : "s"} failed to upload:
                        </p>
                        <ul className="mt-1 list-disc pl-5">
                          {failed.map(({ r, i }) => (
                            <li key={i}>
                              <span className="font-mono">{r.file.name}</span>
                              {r.errorMsg ? ` — ${r.errorMsg}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t bg-ink-50 px-5 py-3">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={submitting}
              >
                {step > 1 ? "Back" : "Cancel"}
              </Button>

              {step < 5 ? (
                <Button
                  onClick={goNext}
                  disabled={
                    (step === 1 && !canNext1) ||
                    (step === 2 && !canNext2) ||
                    (step === 3 && !canNext3) ||
                    (step === 4 && !canNext4)
                  }
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Uploading…" : "Create batch"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {companyId && (
        <FormBuilderModal
          open={formBuilderOpen}
          onOpenChange={setFormBuilderOpen}
          companyId={companyId}
          companyName={companies.find((c) => c.id === companyId)?.name}
          defaultSpecialty={specialty || undefined}
          onCreated={(form) => {
            const next: BatchWizardForm = {
              id: form.id,
              company_id: companyId,
              specialty: form.specialty,
              form_name: form.form_name,
              is_active: true,
            };
            setLocalForms((prev) => [...prev, next]);
            if (!specialty) setSpecialty(form.specialty);
            setCompanyFormId(form.id);
          }}
        />
      )}
    </>
  );
}
