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


/** Parse filename to guess {lastName, specialty} — best-effort.
 *
 * Handles many naming patterns seen in FQHC chart files:
 *   "Family Coicou 1.pdf"              → { lastName: "Coicou", specialty: "Family Medicine" }
 *   "Family. Adee. Q4.1.pdf"           → { lastName: "Adee", specialty: "Family Medicine" }
 *   "100190770_OB_Fielder.pdf"          → { lastName: "Fielder", specialty: "OB/GYN" }
 *   "BH Smith 1.pdf"                   → { lastName: "Smith", specialty: "Behavioral Health" }
 *   "Mental Health. Concepcion. Q4.2"  → { lastName: "Concepcion", specialty: "Mental Health" }
 *   "GILMORE 4.pdf"                    → { lastName: "Gilmore", specialty: null }
 *   "HIV BRIMMER 3.pdf"               → { lastName: "Brimmer", specialty: "HIV" }
 *   "OB. Blackham. Q1.2combined.pdf"   → { lastName: "Blackham", specialty: "OB/GYN" }
 *   "Counselor. Albright. Q4.1.pdf"    → { lastName: "Albright", specialty: "Behavioral Health" }
 */
function parseFilename(name: string): { lastName: string | null; specialty: string | null } {
  const base = name.replace(/\.pdf$/i, "").replace(/combined$/i, "");
  const tokens = base.split(/[\s_.\-]+/).filter(Boolean);

  // Multi-word specialty detection (must check before single-word)
  const MULTI_WORD_SPECIALTIES: [RegExp, string][] = [
    [/^mental\s*health$/i, "Mental Health"],
    [/^behavioral\s*health$/i, "Behavioral Health"],
    [/^family\s*medicine$/i, "Family Medicine"],
    [/^internal\s*medicine$/i, "Internal Medicine"],
    [/^primary\s*care$/i, "Primary Care"],
    [/^emergency\s*medicine$/i, "Emergency Medicine"],
  ];

  const SPECIALTY_MAP: Record<string, string> = {
    ob: "OB/GYN",
    obgyn: "OB/GYN",
    gyn: "OB/GYN",
    gynecology: "OB/GYN",
    obstetrics: "OB/GYN",
    hiv: "HIV",
    mental: "Mental Health",
    behavioral: "Behavioral Health",
    bh: "Behavioral Health",
    psych: "Behavioral Health",
    counselor: "Behavioral Health",
    pediatrics: "Pediatrics",
    pediatric: "Pediatrics",
    peds: "Pediatrics",
    family: "Family Medicine",
    fm: "Family Medicine",
    internal: "Internal Medicine",
    im: "Internal Medicine",
    dental: "Dental",
    cardiology: "Cardiology",
    cardio: "Cardiology",
    dermatology: "Dermatology",
    derm: "Dermatology",
    podiatry: "Podiatry",
    chiropractic: "Chiropractic",
    chiro: "Chiropractic",
    acupuncture: "Acupuncture",
    optometry: "Optometry",
    pharmacy: "Pharmacy",
    neurology: "Neurology",
    orthopedics: "Orthopedics",
    ortho: "Orthopedics",
    urology: "Urology",
    gastroenterology: "Gastroenterology",
    gi: "Gastroenterology",
    primary: "Primary Care",
    emergency: "Emergency Medicine",
  };

  // Noise words to skip when looking for last name
  const NOISE = new Set([
    ...Object.keys(SPECIALTY_MAP),
    "health", "medicine", "care",
  ]);

  // Check multi-word specialties first (join consecutive tokens)
  let specialty: string | null = null;
  const joined = base.replace(/[_.\-]+/g, " ");
  for (const [re, spec] of MULTI_WORD_SPECIALTIES) {
    if (re.test(joined)) {
      specialty = spec;
      break;
    }
  }

  // Single-word specialty
  if (!specialty) {
    for (const t of tokens) {
      const lc = t.toLowerCase();
      if (SPECIALTY_MAP[lc]) {
        specialty = SPECIALTY_MAP[lc];
        break;
      }
    }
  }

  // Last name: find first token that is alphabetic, not a specialty/noise/number/quarter
  let lastName: string | null = null;
  for (const t of tokens) {
    if (/^\d+$/.test(t)) continue;                          // pure number
    if (/^Q\d/i.test(t)) continue;                          // quarter label
    if (/^\d+[A-Za-z]*$/.test(t)) continue;                 // ID like "100190770" or "M6"
    if (NOISE.has(t.toLowerCase())) continue;                // specialty or noise word
    if (SPECIALTY_MAP[t.toLowerCase()]) continue;            // mapped specialty
    if (t.length < 2) continue;                              // too short
    if (/^[A-Za-z]/.test(t)) {                              // starts with a letter
      // Normalize: "GILMORE" → "Gilmore", "Coicou" → "Coicou"
      lastName = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      break;
    }
  }

  // Handle hyphenated last names: "Zamora-Duprey" comes through as separate tokens
  // If the next token after lastName is also alpha and not noise, join them
  if (lastName) {
    const idx = tokens.findIndex(
      (t) => t.toLowerCase() === lastName!.toLowerCase()
    );
    if (idx >= 0 && idx + 1 < tokens.length) {
      const next = tokens[idx + 1];
      if (
        /^[A-Za-z]+$/.test(next) &&
        !NOISE.has(next.toLowerCase()) &&
        !SPECIALTY_MAP[next.toLowerCase()] &&
        !/^\d+$/.test(next) &&
        !/^Q\d/i.test(next)
      ) {
        // Check if original filename had a hyphen between them
        const hyphenPattern = new RegExp(
          `${tokens[idx]}[\\s]*-[\\s]*${next}`,
          "i"
        );
        if (hyphenPattern.test(base)) {
          lastName = `${lastName}-${next.charAt(0).toUpperCase() + next.slice(1).toLowerCase()}`;
        }
      }
    }
  }

  return { lastName, specialty };
}

interface Row {
  file: File;
  providerId: string;
  encounterDate: string;
  /** True while AI is extracting metadata from the PDF */
  extracting?: boolean;
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
  open: controlledOpen,
  onOpenChange,
  defaultCompanyId,
}: {
  companies: BatchWizardCompany[];
  providers: BatchWizardProvider[];
  forms: BatchWizardForm[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultCompanyId?: string;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const skipCompanyStep = !!defaultCompanyId;
  const [step, setStep] = useState(skipCompanyStep ? 2 : 1);
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
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
  // Specialties with an approved form for this client (derived from actual forms, not hardcoded)
  const availableSpecialties = useMemo(() => {
    const specs = new Set<string>();
    for (const f of allForms) {
      if (f.company_id === companyId && f.is_active) specs.add(f.specialty);
    }
    return Array.from(specs).sort();
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
    setStep(skipCompanyStep ? 2 : 1);
    setCompanyId(defaultCompanyId ?? "");
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
    const startIdx = rows.length;
    const next: Row[] = pdfs.map((f) => {
      const parsed = parseFilename(f.name);
      const match = parsed.lastName
        ? companyProviders.find(
            (p) => p.last_name?.toLowerCase() === parsed.lastName!.toLowerCase()
          )
        : null;
      const rowSpec = isMixed
        ? parsed.specialty ?? match?.specialty ?? ""
        : undefined;
      let rowFormId: string | undefined = undefined;
      if (isMixed && rowSpec) {
        const candidates = formsFor(rowSpec);
        if (candidates.length === 1) rowFormId = candidates[0].id;
      }
      return {
        file: f,
        providerId: match?.id ?? "",
        encounterDate: "",
        rowSpecialty: rowSpec,
        companyFormId: rowFormId,
        status: "pending" as const,
        extracting: true,
      };
    });
    setRows((prev) => [...prev, ...next]);

    // Call AI extraction for all files to get encounter date (and provider if not matched by filename)
    for (const row of next) {
      const parsed = parseFilename(row.file.name);
      const providerFoundByFilename = !!parsed.lastName && !!companyProviders.find(
        (p) => p.last_name?.toLowerCase() === parsed.lastName!.toLowerCase()
      );
      extractMetadataFromPdf(row.file, providerFoundByFilename);
    }
  }

  function updateRowByFile(file: File, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.file === file ? { ...r, ...patch } : r)));
  }

  async function extractMetadataFromPdf(file: File, providerAlreadyMatched = false) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('filename', file.name);
      const res = await fetch('/api/upload/extract-metadata', { method: 'POST', body: fd });
      if (!res.ok) {
        updateRowByFile(file, { extracting: false });
        return;
      }
      const data = await res.json();

      const patch: Partial<Row> = { extracting: false };

      // Match provider by extracted name (only if filename didn't already match)
      if (data.provider_name && !providerAlreadyMatched) {
        const nameParts = data.provider_name.trim().split(/\s+/);
        const extractedLast = nameParts[nameParts.length - 1]?.toLowerCase();
        if (extractedLast) {
          const match = companyProviders.find(
            (p) => p.last_name?.toLowerCase() === extractedLast
          );
          if (match) patch.providerId = match.id;
        }
      }

      // Set encounter date
      if (data.encounter_date) {
        patch.encounterDate = data.encounter_date;
      }

      // Set specialty for mixed mode
      if (isMixed && data.specialty) {
        patch.rowSpecialty = data.specialty;
        const candidates = formsFor(data.specialty);
        if (candidates.length === 1) patch.companyFormId = candidates[0].id;
      }

      updateRowByFile(file, patch);
    } catch {
      updateRowByFile(file, { extracting: false });
    }
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
      {controlledOpen === undefined && (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Batch
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border-subtle bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-medium text-ink-primary">New Batch</h2>
                <p className="text-xs text-ink-secondary">Step {skipCompanyStep ? step - 1 : step} of {skipCompanyStep ? 4 : 5}</p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md p-2 text-ink-tertiary hover:bg-ink-100 hover:text-ink-primary"
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
                    n <= step ? "bg-brand" : "bg-ink-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* STEP 1 — company */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-ink-primary">
                    Which client is this batch for?
                  </h3>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      setSpecialty("");
                      setCompanyFormId("");
                    }}
                    className="w-full rounded-lg border border-border-default px-4 py-3 text-sm focus:border-status-info-dot focus:outline-none"
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
                  <h3 className="text-sm font-medium text-ink-primary">Specialty</h3>
                  <p className="text-xs text-ink-secondary">
                    All charts in this batch must be the same specialty. Only specialties with
                    an approved form for this client are shown.
                  </p>
                  {specialty && skipFormStep && (
                    <p className="rounded-lg border border-status-success-fg/30 bg-mint-50 px-3 py-2 text-xs text-status-info-fg">
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
                            ? "border-status-info-dot bg-status-info-bg text-status-info-dot"
                            : "border-border-subtle bg-white hover:border-border-default hover:bg-ink-50"
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
                            ? "border-status-info-dot bg-status-info-bg text-status-info-dot"
                            : "border-dashed border-border-default bg-white hover:border-status-info-dot hover:bg-status-info-bg"
                        }`}
                      >
                        Mixed
                        <div className="text-xs font-normal text-ink-secondary">
                          Multiple specialties — server splits into separate batches
                        </div>
                      </button>
                    )}
                  </div>
                  {availableSpecialties.length === 0 && (
                    <p className="rounded-lg border border-status-warning-dot bg-amber-100 px-4 py-3 text-xs text-status-warning-fg">
                      No approved forms found for this client. Seed `company_forms` first.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 3 — form */}
              {step === 3 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-ink-primary">
                    Approved review form
                  </h3>
                  <p className="text-xs text-ink-secondary">
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
                            ? "border-status-info-dot bg-status-info-bg"
                            : "border-border-subtle bg-white hover:border-border-default hover:bg-ink-50"
                        }`}
                      >
                        <div>
                          <div className="font-medium text-ink-primary">{f.form_name}</div>
                          <div className="text-xs text-ink-secondary">
                            Specialty: {f.specialty}
                          </div>
                        </div>
                        {companyFormId === f.id && <Check className="h-4 w-4 text-status-info-dot" />}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormBuilderOpen(true)}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border-default px-4 py-3 text-left text-sm text-ink-secondary hover:border-status-info-dot hover:bg-status-info-bg hover:text-status-info-dot"
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
                  <h3 className="text-sm font-medium text-ink-primary">Batch details + charts</h3>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-primary">
                      Batch name
                    </label>
                    <input
                      value={batchName}
                      onChange={(e) => {
                        batchNameTouched.current = true;
                        setBatchName(e.target.value);
                      }}
                      placeholder="e.g. Q2 2026 — OB/GYN charts"
                      className="w-full rounded-lg border border-border-default px-4 py-2.5 text-sm focus:border-status-info-dot focus:outline-none"
                    />
                    {batchName && !batchNameTouched.current && (
                      <p className="mt-1 text-xs text-ink-secondary">
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
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-default bg-ink-50 px-6 py-10 text-center hover:border-status-info-dot hover:bg-status-info-bg"
                  >
                    <Upload className="h-6 w-6 text-ink-tertiary" />
                    <span className="text-sm font-medium text-ink-primary">
                      Drop PDFs here or click to browse
                    </span>
                    <span className="text-xs text-ink-secondary">
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
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-ink-primary">
                                {row.file.name}
                              </div>
                              <div className="text-xs text-ink-secondary">
                                {(row.file.size / 1024).toFixed(0)} KB
                                {row.extracting && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-brand">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    AI extracting...
                                  </span>
                                )}
                              </div>
                            </div>

                            <select
                              value={row.providerId}
                              onChange={(e) =>
                                updateRow(i, { providerId: e.target.value })
                              }
                              className="rounded-md border border-border-default px-2 py-1.5 text-xs"
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
                              className="rounded-md border border-border-default px-2 py-1.5 text-xs"
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
                                className="rounded-md border border-border-default px-2 py-1.5 text-xs"
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
                                className="rounded-md border border-border-default px-2 py-1.5 text-xs"
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
                              className="rounded p-1 text-ink-tertiary hover:bg-ink-100 hover:text-status-danger-dot"
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
                  <h3 className="text-sm font-medium text-ink-primary">Review and submit</h3>

                  <dl className="space-y-1.5 rounded-lg border border-border-subtle bg-ink-50 px-4 py-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-secondary">Client</dt>
                      <dd className="font-medium text-ink-primary">
                        {companies.find((c) => c.id === companyId)?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-secondary">Specialty</dt>
                      <dd className="font-medium text-ink-primary">{specialty}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-secondary">Form</dt>
                      <dd className="font-medium text-ink-primary">
                        {allForms.find((f) => f.id === effectiveFormId)?.form_name}
                        {skipFormStep && (
                          <span className="ml-2 rounded bg-mint-100 px-1.5 py-0.5 text-[10px] font-medium text-status-info-fg">
                            AUTO
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-secondary">Batch name</dt>
                      <dd className="font-medium text-ink-primary">{batchName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-secondary">Cases</dt>
                      <dd className="font-medium text-ink-primary">{rows.length}</dd>
                    </div>
                  </dl>

                  <div className="space-y-1.5">
                    {rows.map((row, i) => {
                      const p = companyProviders.find((pp) => pp.id === row.providerId);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-md border border-border-subtle bg-white px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-ink-primary">
                              {p ? `${p.first_name} ${p.last_name}` : "Unassigned"}
                            </span>
                            <span className="ml-2 text-ink-secondary">{row.file.name}</span>
                          </div>
                          <div className="ml-3 flex items-center gap-1.5">
                            {row.status === "pending" && (
                              <span className="text-ink-tertiary">Queued</span>
                            )}
                            {row.status === "uploading" && (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-status-info-dot" />
                                <span className="text-status-info-dot">Uploading…</span>
                              </>
                            )}
                            {row.status === "done" && (
                              <>
                                <Check className="h-3 w-3 text-status-info-dot" />
                                <span className="text-status-info-dot">Uploaded</span>
                              </>
                            )}
                            {row.status === "error" && (
                              <span className="text-status-danger-dot" title={row.errorMsg}>
                                Failed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {submitError && (
                    <div className="rounded-lg border border-status-danger-dot bg-critical-100 px-3 py-2 text-xs text-status-danger-fg">
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
