"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, ChevronRight, X, Loader2 } from "lucide-react";

type Company = { id: string; name: string };
type Provider = {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  company_id: string;
};
type Form = { id: string; specialty: string; form_name: string };

interface Row {
  file: File;
  providerId: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
}

function parseLast(name: string): string | null {
  const base = name.replace(/\.pdf$/i, "");
  const tokens = base.split(/[\s_.\-]+/).filter(Boolean);
  for (const t of tokens) {
    if (/^\d+$/.test(t) || /^Q\d/i.test(t) || t.length < 3) continue;
    if (/^[A-Z][a-z]+$/.test(t) || /^[A-Z]+$/.test(t)) {
      return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    }
  }
  return null;
}

export function ClientSubmitWizard({
  company,
  providers,
  forms,
}: {
  company: Company;
  providers: Provider[];
  forms: Form[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [specialty, setSpecialty] = useState("");
  const [formId, setFormId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedBatchId, setSubmittedBatchId] = useState<string | null>(null);

  const availableSpecialties = useMemo(() => {
    const set = new Set(forms.map((f) => f.specialty));
    return Array.from(set).sort();
  }, [forms]);
  const specialtyForms = useMemo(
    () => forms.filter((f) => f.specialty === specialty),
    [forms, specialty]
  );
  const specialtyProviders = useMemo(
    () => providers.filter((p) => !p.specialty || p.specialty === specialty),
    [providers, specialty]
  );

  // Auto-attach: if exactly one approved form exists for this specialty,
  // stamp it silently and skip the form-picker step.
  const autoAttachedFormId = specialtyForms.length === 1 ? specialtyForms[0].id : "";
  const effectiveFormId = formId || autoAttachedFormId;
  const skipFormStep = specialtyForms.length === 1;

  function goNext() {
    if (step === 1 && skipFormStep) {
      if (!formId) setFormId(autoAttachedFormId);
      setStep(3);
      return;
    }
    setStep(step + 1);
  }
  function goBack() {
    if (step === 3 && skipFormStep) {
      setStep(1);
      return;
    }
    if (step > 1) setStep(step - 1);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const pdfs = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    const next: Row[] = pdfs.map((f) => {
      const last = parseLast(f.name);
      const match = last
        ? specialtyProviders.find(
            (p) => p.last_name?.toLowerCase() === last.toLowerCase()
          )
        : null;
      return {
        file: f,
        providerId: match?.id ?? specialtyProviders[0]?.id ?? "",
        status: "pending",
      };
    });
    setRows((prev) => [...prev, ...next]);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i));
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (!batchName.trim()) throw new Error("Batch name is required.");
      if (rows.some((r) => !r.providerId))
        throw new Error("Each chart needs a provider selected.");

      const createRes = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_name: batchName,
          company_id: company.id,
          specialty,
          company_form_id: effectiveFormId,
          status: "pending_admin_review",
          submitted_by: company.name,
          cases: rows.map((r) => ({
            provider_id: r.providerId,
            specialty_required: specialty,
            chart_file_name: r.file.name,
          })),
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || "Submission failed");
      }
      const { data: batch, cases } = (await createRes.json()) as {
        data: { id: string };
        cases: Array<{ id: string; chart_file_name: string | null }>;
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const match =
          cases.find((c) => c.chart_file_name === row.file.name) ?? cases[i];
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

      setSubmittedBatchId(batch.id);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedBatchId) {
    return (
      <div className="space-y-4 py-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-400">
          <Check className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Records submitted</h3>
          <p className="mt-1 text-sm text-white/60">
            Peerspectiv has been notified. Your batch will be activated after an
            intake check — you&rsquo;ll see it update on the dashboard.
          </p>
        </div>
        <button
          onClick={() => {
            setSubmittedBatchId(null);
            setStep(1);
            setSpecialty("");
            setFormId("");
            setBatchName("");
            setRows([]);
          }}
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Submit another batch
        </button>
      </div>
    );
  }

  const btnDark =
    "rounded-lg bg-[#2E6FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2658b7] disabled:opacity-50 disabled:cursor-not-allowed";
  const btnGhost =
    "rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10";

  return (
    <div className="space-y-5">
      {/* steps */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${
              n <= step ? "bg-[#2E6FE8]" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-white/50">Step {step} of 4</p>

      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            What specialty are these charts?
          </h3>
          <p className="text-xs text-white/50">
            Each submission is for one specialty. Submit separate batches for
            each clinic service line.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {availableSpecialties.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSpecialty(s);
                  setFormId("");
                }}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  specialty === s
                    ? "border-[#2E6FE8] bg-[#2E6FE8]/20 text-white"
                    : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {availableSpecialties.length === 0 && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              No approved forms on file. Contact Peerspectiv to set up specialty forms.
            </p>
          )}
          {specialty && skipFormStep && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
              <Check className="mr-1 inline h-3 w-3" />
              <strong>{specialtyForms[0].form_name}</strong> will be auto-attached
              — it&rsquo;s your only approved form for {specialty}.
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Which review form applies?
          </h3>
          <p className="text-xs text-white/50">
            This is the criteria your team pre-approved with Peerspectiv.
          </p>
          <div className="space-y-2 pt-2">
            {specialtyForms.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormId(f.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  formId === f.id
                    ? "border-[#2E6FE8] bg-[#2E6FE8]/15"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div>
                  <div className="font-medium text-white">{f.form_name}</div>
                  <div className="text-xs text-white/50">Specialty: {f.specialty}</div>
                </div>
                {formId === f.id && <Check className="h-4 w-4 text-[#2E6FE8]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Upload charts</h3>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/70">
              Batch label
            </label>
            <input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={`e.g. Q2 2026 — ${specialty}`}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[#2E6FE8] focus:outline-none"
            />
          </div>

          <label
            htmlFor="client-submit-pdfs"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 bg-white/5 px-6 py-10 text-center hover:border-[#2E6FE8] hover:bg-[#2E6FE8]/10"
          >
            <Upload className="h-6 w-6 text-white/40" />
            <span className="text-sm font-medium text-white">
              Drop PDFs here or click to browse
            </span>
            <span className="text-xs text-white/50">
              One PDF per chart. We&rsquo;ll match providers from the filename.
            </span>
            <input
              id="client-submit-pdfs"
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
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-white">
                      {row.file.name}
                    </div>
                    <div className="text-xs text-white/50">
                      {(row.file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <select
                    value={row.providerId}
                    onChange={(e) => updateRow(i, { providerId: e.target.value })}
                    className="rounded-md border border-white/10 bg-[#0B1829] px-2 py-1.5 text-xs text-white"
                  >
                    <option value="">Pick provider…</option>
                    {specialtyProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeRow(i)}
                    className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-red-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Review and submit</h3>

          <dl className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/50">Client</dt>
              <dd className="font-medium text-white">{company.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Specialty</dt>
              <dd className="font-medium text-white">{specialty}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Form</dt>
              <dd className="font-medium text-white">
                {forms.find((f) => f.id === effectiveFormId)?.form_name}
                {skipFormStep && (
                  <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                    AUTO
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Batch label</dt>
              <dd className="font-medium text-white">{batchName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Charts</dt>
              <dd className="font-medium text-white">{rows.length}</dd>
            </div>
          </dl>

          <div className="space-y-1.5">
            {rows.map((row, i) => {
              const p = specialtyProviders.find((pp) => pp.id === row.providerId);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-white">
                      {p ? `${p.first_name} ${p.last_name}` : "Unassigned"}
                    </span>
                    <span className="ml-2 text-white/50">{row.file.name}</span>
                  </div>
                  <div className="ml-3 flex items-center gap-1.5">
                    {row.status === "pending" && (
                      <span className="text-white/40">Queued</span>
                    )}
                    {row.status === "uploading" && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-[#2E6FE8]" />
                        <span className="text-[#2E6FE8]">Uploading…</span>
                      </>
                    )}
                    {row.status === "done" && (
                      <>
                        <Check className="h-3 w-3 text-green-400" />
                        <span className="text-green-400">Uploaded</span>
                      </>
                    )}
                    {row.status === "error" && (
                      <span className="text-red-400" title={row.errorMsg}>
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {submitError}
            </div>
          )}

          <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            Submitting will queue this batch for Peerspectiv intake. Peerspectiv
            will activate it and assign reviewers.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          className={btnGhost}
          onClick={goBack}
          disabled={submitting || step === 1}
        >
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={goNext}
            disabled={
              (step === 1 && !specialty) ||
              (step === 2 && !effectiveFormId) ||
              (step === 3 && (!batchName.trim() || rows.length === 0))
            }
            className={`${btnDark} inline-flex items-center gap-1`}
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`${btnDark} inline-flex items-center gap-2`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Submitting…" : "Submit batch"}
          </button>
        )}
      </div>
    </div>
  );
}
