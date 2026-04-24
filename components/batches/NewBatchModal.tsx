"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Check, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BatchWizardCompany = { id: string; name: string };
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

const CORE_SPECIALTIES = [
  "Family Medicine",
  "Internal Medicine",
  "Pediatrics",
  "OB/GYN",
  "Behavioral Health",
  "Dental",
  "Cardiology",
  "Acupuncture",
  "Chiropractic",
  "Podiatry",
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
    pediatrics: "Pediatrics",
    pediatric: "Pediatrics",
    peds: "Pediatrics",
    family: "Family Medicine",
    fm: "Family Medicine",
    internal: "Internal Medicine",
    im: "Internal Medicine",
    cardiology: "Cardiology",
    cardio: "Cardiology",
    chiropractic: "Chiropractic",
    chiro: "Chiropractic",
    acupuncture: "Acupuncture",
    podiatry: "Podiatry",
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
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
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

  const companyProviders = useMemo(
    () => providers.filter((p) => p.company_id === companyId),
    [providers, companyId]
  );
  const specialtyForms = useMemo(
    () => forms.filter((f) => f.company_id === companyId && f.specialty === specialty),
    [forms, companyId, specialty]
  );
  // Specialties that have BOTH at least one provider at this company AND an approved form
  const availableSpecialties = useMemo(() => {
    const hasForm = new Set(forms.filter((f) => f.company_id === companyId).map((f) => f.specialty));
    return CORE_SPECIALTIES.filter((s) => hasForm.has(s));
  }, [forms, companyId]);

  function reset() {
    setStep(1);
    setCompanyId("");
    setSpecialty("");
    setCompanyFormId("");
    setBatchName("");
    setRows([]);
    setSubmitting(false);
    setSubmitError(null);
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
      const { lastName } = parseFilename(f.name);
      // find best provider match within companyProviders
      const match = lastName
        ? companyProviders.find(
            (p) => p.last_name?.toLowerCase() === lastName.toLowerCase()
          )
        : null;
      return {
        file: f,
        providerId: match?.id ?? companyProviders[0]?.id ?? "",
        encounterDate: "",
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
      const createRes = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_name: batchName,
          company_id: companyId,
          specialty,
          company_form_id: companyFormId,
          cases: rows.map((r) => ({
            provider_id: r.providerId,
            specialty_required: specialty,
            encounter_date: r.encounterDate || null,
            chart_file_name: r.file.name,
          })),
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || "Batch creation failed");
      }

      const { data: batch, cases } = (await createRes.json()) as {
        data: { id: string };
        cases: Array<{ id: string; chart_file_name: string | null; provider_id: string | null }>;
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

      // Navigate to the new batch
      router.push(`/batches/${batch.id}`);
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

  const canNext1 = !!companyId;
  const canNext2 = !!specialty && availableSpecialties.includes(specialty);
  const canNext3 = !!companyFormId;
  const canNext4 = rows.length > 0 && !!batchName.trim();

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
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">New Batch</h2>
                <p className="text-xs text-gray-500">Step {step} of 5</p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 border-b bg-gray-50 px-5 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`h-1 flex-1 rounded-full ${
                    n <= step ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* STEP 1 — company */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Which client is this batch for?
                  </h3>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      setSpecialty("");
                      setCompanyFormId("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
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
                  <h3 className="text-sm font-semibold text-gray-900">Specialty</h3>
                  <p className="text-xs text-gray-500">
                    All charts in this batch must be the same specialty. Only specialties with
                    an approved form for this client are shown.
                  </p>
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
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {availableSpecialties.length === 0 && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      No approved forms found for this client. Seed `company_forms` first.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 3 — form */}
              {step === 3 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Approved review form
                  </h3>
                  <p className="text-xs text-gray-500">
                    This is the form the reviewer will use. It must be pre-approved by the
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
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <div className="font-medium text-gray-900">{f.form_name}</div>
                          <div className="text-xs text-gray-500">
                            Specialty: {f.specialty}
                          </div>
                        </div>
                        {companyFormId === f.id && <Check className="h-4 w-4 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4 — upload */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Batch details + charts</h3>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Batch name
                    </label>
                    <input
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g. Q2 2026 — OB/GYN charts"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <label
                    htmlFor="batch-pdfs"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center hover:border-blue-400 hover:bg-blue-50"
                  >
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      Drop PDFs here or click to browse
                    </span>
                    <span className="text-xs text-gray-500">
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
                      {rows.map((row, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-gray-900">
                              {row.file.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(row.file.size / 1024).toFixed(0)} KB
                            </div>
                          </div>

                          <select
                            value={row.providerId}
                            onChange={(e) => updateRow(i, { providerId: e.target.value })}
                            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                          >
                            <option value="">Pick provider…</option>
                            {companyProviders.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.first_name} {p.last_name}
                                {p.specialty ? ` — ${p.specialty}` : ""}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => removeRow(i)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5 — confirm / upload progress */}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Review and submit</h3>

                  <dl className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Client</dt>
                      <dd className="font-medium text-gray-900">
                        {companies.find((c) => c.id === companyId)?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Specialty</dt>
                      <dd className="font-medium text-gray-900">{specialty}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Form</dt>
                      <dd className="font-medium text-gray-900">
                        {forms.find((f) => f.id === companyFormId)?.form_name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Batch name</dt>
                      <dd className="font-medium text-gray-900">{batchName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Cases</dt>
                      <dd className="font-medium text-gray-900">{rows.length}</dd>
                    </div>
                  </dl>

                  <div className="space-y-1.5">
                    {rows.map((row, i) => {
                      const p = companyProviders.find((pp) => pp.id === row.providerId);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-gray-900">
                              {p ? `${p.first_name} ${p.last_name}` : "Unassigned"}
                            </span>
                            <span className="ml-2 text-gray-500">{row.file.name}</span>
                          </div>
                          <div className="ml-3 flex items-center gap-1.5">
                            {row.status === "pending" && (
                              <span className="text-gray-400">Queued</span>
                            )}
                            {row.status === "uploading" && (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                <span className="text-blue-600">Uploading…</span>
                              </>
                            )}
                            {row.status === "done" && (
                              <>
                                <Check className="h-3 w-3 text-green-600" />
                                <span className="text-green-600">Uploaded</span>
                              </>
                            )}
                            {row.status === "error" && (
                              <span className="text-red-600" title={row.errorMsg}>
                                Failed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {submitError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {submitError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t bg-gray-50 px-5 py-3">
              <Button
                variant="ghost"
                onClick={() => (step > 1 ? setStep(step - 1) : handleClose())}
                disabled={submitting}
              >
                {step > 1 ? "Back" : "Cancel"}
              </Button>

              {step < 5 ? (
                <Button
                  onClick={() => setStep(step + 1)}
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
    </>
  );
}
