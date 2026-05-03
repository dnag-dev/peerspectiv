"use client";

// TODO Section F8: when company.tier !== 'white_glove', gate prefill behind a
// per-form allow_ai_prefill flag. See docs/product-roadmap.md.

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

/* ──────────────────────── Types ──────────────────────── */

export type FieldType = "yes_no" | "rating" | "text";

export interface FormField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
  // Section C metadata (yes_no extensions)
  allowNa?: boolean;
  defaultValue?: "yes" | "no" | "na" | null;
  requiredTextOnNonDefault?: boolean;
  opsTerm?: string | null;
}

export type Confidence = "high" | "medium" | "low";

export interface AIPrefill {
  value: unknown;
  confidence: Confidence;
  reasoning?: string;
  pageReference?: string;
}

export interface ReviewFormSubmitData {
  form_responses: Record<
    string,
    {
      value: unknown;
      comment?: string;
      overridden: boolean;
      ai_value?: unknown;
    }
  >;
  peer_comments: string;
  license_snapshot?: {
    license_number: string;
    license_state: string;
    attested_at: string;
  };
  mrn_number?: string;
  peer_signature_text?: string;
}

export interface PeerLicenseInfo {
  fullName: string | null;
  credential?: string | null;
  licenseNumber: string | null;
  licenseState: string | null;
}

interface ReviewFormProps {
  caseId: string;
  peerId: string;
  formFields: FormField[];
  aiPrefills?: Record<string, AIPrefill>;
  onSubmit?: (data: ReviewFormSubmitData) => Promise<void>;
  peerLicense?: PeerLicenseInfo;
  /** Existing MRN persisted on review_cases (Section C.4). */
  initialMrnNumber?: string | null;
  /** company_forms.allow_ai_generated_recommendations (Section C.5). */
  allowAiNarrative?: boolean;
  /** Section F5: hover-to-jump callback wired up by PeerCaseSplit so
   *  hovering a field label can scroll the PDF iframe to the relevant page. */
  onFieldHover?: (fieldKey: string, fieldLabel: string) => void;
}

interface FieldState {
  value: unknown;
  comment: string;
  touched: boolean;
}

/* ──────────────────────── Helpers ──────────────────────── */

// Pulse confidence chips on light surface — soft tint + matching ink text.
function confidenceClasses(c: Confidence) {
  switch (c) {
    case "high":
      return "bg-mint-50 border-mint-200 text-mint-700";
    case "medium":
      return "bg-amber-50 border-amber-100 text-amber-700";
    case "low":
      return "bg-critical-50 border-critical-100 text-critical-700";
  }
}

function ratingLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 60) return "Acceptable";
  return "Below standard";
}

// Light-surface rating label colors.
function ratingLabelColor(score: number): string {
  if (score >= 80) return "text-mint-700";
  if (score >= 60) return "text-amber-700";
  return "text-critical-700";
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === "number" && typeof b === "number") return a === b;
  return String(a).trim() === String(b).trim();
}

/* ──────────────────────── Component ──────────────────────── */

export function ReviewForm({
  caseId,
  peerId,
  formFields,
  aiPrefills = {},
  onSubmit,
  peerLicense,
  initialMrnNumber,
  allowAiNarrative,
  onFieldHover,
}: ReviewFormProps) {
  // Section F5: hover-to-jump toggle, persisted in localStorage. Default ON.
  const [hoverJumpEnabled, setHoverJumpEnabled] = useState<boolean>(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("peerspectiv.reviewer.hoverJump");
      if (raw === "off") setHoverJumpEnabled(false);
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "peerspectiv.reviewer.hoverJump",
        hoverJumpEnabled ? "on" : "off"
      );
    } catch {
      // ignore
    }
  }, [hoverJumpEnabled]);
  const startedAt = useRef(Date.now());

  // ── MRN (Section C.4) ──
  const [mrnNumber, setMrnNumber] = useState<string>(initialMrnNumber ?? "");
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);

  // ── License attestation state (Phase 4.B — HRSA audit trail) ──
  const [licenseNumber, setLicenseNumber] = useState<string>(
    peerLicense?.licenseNumber ?? ""
  );
  const [licenseState, setLicenseState] = useState<string>(
    peerLicense?.licenseState ?? ""
  );
  const [attested, setAttested] = useState(false);

  const sortedFields = useMemo(
    () => [...formFields].sort((a, b) => a.displayOrder - b.displayOrder),
    [formFields]
  );

  const [state, setState] = useState<Record<string, FieldState>>(() => {
    const s: Record<string, FieldState> = {};
    for (const f of sortedFields) {
      const prefill = aiPrefills[f.fieldKey];
      s[f.fieldKey] = {
        value: prefill?.value ?? (f.fieldType === "yes_no" ? null : ""),
        comment: "",
        touched: false,
      };
    }
    return s;
  });

  const [peerComments, setPeerComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set());

  const setFieldValue = useCallback((key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { comment: "", touched: false, value: null }), value, touched: true },
    }));
    setMissingKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const setFieldComment = useCallback((key: string, comment: string) => {
    setState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { value: null, touched: false, comment: "" }), comment },
    }));
  }, []);

  function isEmpty(field: FormField, value: unknown): boolean {
    if (field.fieldType === "yes_no") {
      // Accept legacy booleans plus the new "na" string.
      return value !== true && value !== false && value !== "na";
    }
    if (field.fieldType === "rating") {
      return (
        value == null ||
        value === "" ||
        (typeof value === "number" && Number.isNaN(value))
      );
    }
    return value == null || String(value).trim() === "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitted) return;
    setError(null);

    // License attestation gate — must be filled and attested before submit.
    if (!licenseNumber.trim() || !licenseState.trim()) {
      setError("License number and state are required for HRSA audit.");
      return;
    }
    if (!attested) {
      setError("You must attest to your license before submitting.");
      return;
    }

    // MRN gate (Section C.4) — required, but accepts "redacted"/"N/A" verbatim.
    if (!mrnNumber.trim()) {
      setError("MRN Number is required (enter 'redacted' or 'N/A' if unavailable).");
      return;
    }

    const missing = new Set<string>();
    for (const f of sortedFields) {
      if (f.isRequired && isEmpty(f, state[f.fieldKey]?.value)) {
        missing.add(f.fieldKey);
      }
      // Section C.2: if required_text_on_non_default fires, comment must be present.
      if (f.fieldType === "yes_no" && f.requiredTextOnNonDefault && f.defaultValue) {
        const v = state[f.fieldKey]?.value;
        const answered = v === true || v === false || v === "na";
        const isDefault =
          (v === true && f.defaultValue === "yes") ||
          (v === false && f.defaultValue === "no") ||
          (v === "na" && f.defaultValue === "na");
        // NA always exempts.
        if (answered && v !== "na" && !isDefault) {
          const comment = state[f.fieldKey]?.comment ?? "";
          if (!comment.trim()) missing.add(f.fieldKey);
        }
      }
    }
    if (missing.size > 0) {
      setMissingKeys(missing);
      setError(
        `Please complete ${missing.size} required field${missing.size === 1 ? "" : "s"} before submitting.`
      );
      return;
    }

    const form_responses: ReviewFormSubmitData["form_responses"] = {};
    for (const f of sortedFields) {
      const s = state[f.fieldKey];
      const aiValue = aiPrefills[f.fieldKey]?.value;
      const overridden =
        aiValue !== undefined && !valuesEqual(aiValue, s?.value);
      form_responses[f.fieldKey] = {
        value: s?.value ?? null,
        comment: s?.comment || undefined,
        overridden,
        ai_value: aiValue,
      };
    }

    const licenseSnapshot = {
      license_number: licenseNumber.trim(),
      license_state: licenseState.trim().toUpperCase(),
      attested_at: new Date().toISOString(),
    };

    // Section C.4 — assemble peer signature text for review_results.
    const peerDisplayName = peerLicense?.fullName?.trim() || "Peer";
    const signedOn = new Date().toISOString().slice(0, 10);
    const peerSignatureText = `${peerDisplayName}, License ${licenseSnapshot.license_state}-${licenseSnapshot.license_number}, signed ${signedOn}`;

    const payload: ReviewFormSubmitData = {
      form_responses,
      peer_comments: peerComments,
      license_snapshot: licenseSnapshot,
      mrn_number: mrnNumber.trim(),
      peer_signature_text: peerSignatureText,
    };

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const timeSpent = Math.round(
          (Date.now() - startedAt.current) / 60000
        );
        const criteriaScores = sortedFields
          .filter((f) => f.fieldType === "rating")
          .map((f) => {
            const val = state[f.fieldKey]?.value;
            const numeric =
              typeof val === "number"
                ? val
                : typeof val === "string"
                  ? parseFloat(val)
                  : 0;
            const scaled = Math.round(
              Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : 0))
            );
            return {
              criterion: f.fieldLabel,
              score: Math.round(scaled / 25),
              score_label: ratingLabel(scaled),
              rationale: state[f.fieldKey]?.comment || "",
              ai_flag: false,
              flag_reason: null,
            };
          });

        const overallScore =
          criteriaScores.length > 0
            ? Math.round(
                (criteriaScores.reduce((s, c) => s + c.score * 25, 0) /
                  criteriaScores.length)
              )
            : 0;

        const narrativeField = sortedFields.find(
          (f) => f.fieldKey === "narrative_final" || f.fieldType === "text"
        );
        const narrative = narrativeField
          ? String(state[narrativeField.fieldKey]?.value ?? "")
          : peerComments;

        const res = await fetch("/api/peer/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_id: caseId,
            criteria_scores: criteriaScores,
            deficiencies: [],
            overall_score: overallScore,
            narrative_final: narrative.trim() || peerComments || "Peer submitted form.",
            time_spent_minutes: timeSpent,
            license_snapshot: licenseSnapshot,
            mrn_number: mrnNumber.trim(),
            peer_signature_text: peerSignatureText,
            form_responses,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Submit failed (${res.status})`);
        }
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-mint-200 bg-mint-50 p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mint-100">
          <svg
            className="h-7 w-7 text-mint-700"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="text-h2 text-ink-900">Review Submitted</h2>
        <p className="mt-2 text-small text-ink-500">
          Your review has been saved successfully.
        </p>
      </div>
    );
  }

  if (sortedFields.length === 0) {
    return (
      <div className="rounded-xl border border-ink-200 bg-paper-surface p-10 text-center text-ink-500">
        No form fields configured for this specialty.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      {/* TODO Section F8: gate prefill rendering behind allow_ai_prefill flag
          when company.tier !== 'white_glove'. See docs/product-roadmap.md. */}
      <div className="rounded-xl border border-ink-200 bg-paper-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-eyebrow text-ink-500">PEER · ASSESSMENT</div>
            <h2 className="mt-1 text-h2 text-ink-900">Peer Review</h2>
            <p className="mt-1 text-small text-ink-500">
              Review each field below. AI prefills are shown with confidence
              indicators — override where your clinical judgment differs.
            </p>
          </div>
          {/* Section F5: hover-to-jump toggle. */}
          {onFieldHover && (
            <label className="flex flex-shrink-0 items-center gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                data-testid="hover-jump-toggle"
                checked={hoverJumpEnabled}
                onChange={(e) => setHoverJumpEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-cobalt-700 focus:ring-cobalt-200"
              />
              Highlight on hover
            </label>
          )}
        </div>
      </div>

      {/* ── MRN Number (Section C.4) ── */}
      <div className="rounded-xl border border-ink-200 bg-paper-surface p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          MRN Number
          <span className="rounded-full bg-cobalt-50 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-cobalt-700">
            required
          </span>
        </label>
        <input
          type="text"
          data-testid="mrn-number-input"
          value={mrnNumber}
          onChange={(e) => setMrnNumber(e.target.value)}
          placeholder='Enter MRN, or type "redacted" / "N/A" if unavailable'
          className="mt-2 w-full rounded-lg border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
        />
        <p className="mt-1 text-xs text-ink-500">
          Snapshotted onto the review record.
        </p>
      </div>

      {/* ── License attestation (HRSA audit) ── */}
      <div
        data-testid="license-attestation"
        className="rounded-xl border-2 border-cobalt-200 bg-cobalt-50/40 p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-eyebrow text-cobalt-700">
              PEER · LICENSE ATTESTATION
            </div>
            <h3 className="mt-1 text-base font-semibold text-ink-900">
              You are reviewing this case as:{" "}
              <span className="text-cobalt-800">
                {peerLicense?.fullName ?? "Peer"}
                {peerLicense?.credential ? `, ${peerLicense.credential}` : ""}
              </span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              Your responses below will be permanently attached to this license
              for HRSA audit. Verify your license details before submitting.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-cobalt-200 bg-paper-surface px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wide text-cobalt-700">
            Required
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">
              License #
            </label>
            <input
              type="text"
              data-testid="license-number-input"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. MD123456"
              className="w-full rounded-lg border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">
              State
            </label>
            <input
              type="text"
              data-testid="license-state-input"
              value={licenseState}
              maxLength={2}
              onChange={(e) =>
                setLicenseState(e.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="e.g. CA"
              className="w-full rounded-lg border border-ink-200 bg-paper-surface px-3 py-2 text-sm uppercase text-ink-900 outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
            />
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-700">
          <input
            type="checkbox"
            data-testid="license-attest-checkbox"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-ink-300 text-cobalt-700 focus:ring-cobalt-200"
          />
          <span>
            I attest that the above license is current, in good standing, and
            that I am personally performing this peer review under that license.
            I understand this attestation is recorded for HRSA audit purposes.
          </span>
        </label>
      </div>

      {sortedFields.map((field) => {
        const fieldState = state[field.fieldKey] ?? {
          value: null,
          comment: "",
          touched: false,
        };
        const prefill = aiPrefills[field.fieldKey];
        const overridden =
          prefill !== undefined &&
          fieldState.touched &&
          !valuesEqual(prefill.value, fieldState.value);
        const isMissing = missingKeys.has(field.fieldKey);

        return (
          <div
            key={field.id}
            data-testid="form-field"
            data-field-key={field.fieldKey}
            onMouseEnter={
              hoverJumpEnabled && onFieldHover
                ? () => onFieldHover(field.fieldKey, field.fieldLabel)
                : undefined
            }
            className={`rounded-xl border bg-paper-surface p-5 transition-colors ${
              isMissing
                ? "border-critical-100 ring-1 ring-critical-100"
                : overridden
                  ? "border-amber-100"
                  : "border-ink-200"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  {field.fieldLabel}
                  {field.isRequired && (
                    <span className="rounded-full bg-cobalt-50 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-cobalt-700">
                      required
                    </span>
                  )}
                </label>
                {/* TODO Section F8: gate this prefill block behind
                    allow_ai_prefill when company.tier !== 'white_glove'. */}
                {prefill && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                      data-testid="confidence-badge"
                      data-confidence={prefill.confidence}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${confidenceClasses(
                        prefill.confidence
                      )}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          prefill.confidence === "high"
                            ? "bg-mint-600"
                            : prefill.confidence === "medium"
                              ? "bg-amber-600"
                              : "bg-critical-600"
                        }`}
                      />
                      AI {prefill.confidence}
                    </span>
                    {prefill.pageReference && (
                      <span className="text-[10px] text-ink-400">
                        Ref: {prefill.pageReference}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {overridden && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Overridden
                </span>
              )}
            </div>

            {prefill?.reasoning && (
              <p
                data-testid="ai-reasoning"
                className="mb-3 text-xs italic leading-relaxed text-ink-500"
              >
                {prefill.reasoning}
              </p>
            )}

            {/* Field Renderers */}
            {field.fieldType === "yes_no" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="field-toggle"
                  data-field-key={field.fieldKey}
                  data-value={fieldState.value === true ? "true" : "false"}
                  onClick={() => setFieldValue(field.fieldKey, true)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    fieldState.value === true
                      ? "border-cobalt-700 bg-cobalt-700 text-white"
                      : "border-ink-200 bg-paper-surface text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  data-testid="field-toggle"
                  data-field-key={`${field.fieldKey}_no`}
                  data-value={fieldState.value === false ? "true" : "false"}
                  onClick={() => setFieldValue(field.fieldKey, false)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    fieldState.value === false
                      ? "border-ink-700 bg-ink-700 text-white"
                      : "border-ink-200 bg-paper-surface text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  No
                </button>
                {field.allowNa && (
                  <button
                    type="button"
                    data-testid="field-toggle"
                    data-field-key={`${field.fieldKey}_na`}
                    data-value={fieldState.value === "na" ? "true" : "false"}
                    onClick={() => setFieldValue(field.fieldKey, "na")}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                      fieldState.value === "na"
                        ? "border-ink-400 bg-ink-100 text-ink-900"
                        : "border-ink-200 bg-paper-surface text-ink-700 hover:bg-ink-50"
                    }`}
                  >
                    N/A
                  </button>
                )}
              </div>
            )}

            {field.fieldType === "rating" && (
              <div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={
                      fieldState.value == null || fieldState.value === ""
                        ? ""
                        : String(fieldState.value)
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setFieldValue(field.fieldKey, "");
                      } else {
                        const n = Math.max(
                          0,
                          Math.min(100, parseInt(v, 10) || 0)
                        );
                        setFieldValue(field.fieldKey, n);
                      }
                    }}
                    className="w-28 rounded-lg border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
                    placeholder="0-100"
                  />
                  <span className="text-xs text-ink-400">/ 100</span>
                  {typeof fieldState.value === "number" && (
                    <span
                      className={`text-sm font-medium ${ratingLabelColor(fieldState.value)}`}
                    >
                      {ratingLabel(fieldState.value)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {field.fieldType === "text" && (
              <textarea
                value={String(fieldState.value ?? "")}
                onChange={(e) => setFieldValue(field.fieldKey, e.target.value)}
                rows={4}
                className="w-full resize-y rounded-lg border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
                placeholder="Enter your assessment..."
              />
            )}

            {/* Field-level comment — required when answer != default and != NA (Section C.2) */}
            {(() => {
              const v = fieldState.value;
              const commentRequired =
                field.fieldType === "yes_no" &&
                !!field.requiredTextOnNonDefault &&
                !!field.defaultValue &&
                (v === true || v === false) &&
                !(
                  (v === true && field.defaultValue === "yes") ||
                  (v === false && field.defaultValue === "no")
                );
              const placeholder = commentRequired
                ? "Required: explain why your answer differs from the expected default"
                : "Add a comment (optional)";
              return (
                <textarea
                  value={fieldState.comment}
                  onChange={(e) => setFieldComment(field.fieldKey, e.target.value)}
                  rows={commentRequired ? 2 : 1}
                  placeholder={placeholder}
                  className={`mt-3 w-full resize-y rounded-lg border bg-paper-surface px-3 py-2 text-xs text-ink-700 placeholder:text-ink-400 outline-none focus:border-cobalt-700 ${
                    commentRequired
                      ? "border-amber-300 ring-1 ring-amber-100"
                      : "border-ink-200"
                  }`}
                />
              );
            })()}
          </div>
        );
      })}

      {/* Peer overall comments */}
      <div className="rounded-xl border border-ink-200 bg-paper-surface p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-sm font-semibold text-ink-900">
            Overall Peer Comments
          </label>
          {allowAiNarrative && (
            <button
              type="button"
              data-testid="ai-suggest-narrative"
              disabled={aiSuggestLoading}
              onClick={async () => {
                setAiSuggestError(null);
                setAiSuggestLoading(true);
                try {
                  const res = await fetch("/api/peer/ai-suggest-narrative", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ case_id: caseId, draft: peerComments }),
                  });
                  const j = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(j.error || `AI request failed (${res.status})`);
                  if (typeof j.text === "string" && j.text.trim()) {
                    // Replace — peer can still edit. (Section C.5)
                    setPeerComments(j.text.trim());
                  }
                } catch (err) {
                  setAiSuggestError(
                    err instanceof Error ? err.message : "AI suggestion failed"
                  );
                } finally {
                  setAiSuggestLoading(false);
                }
              }}
              className="inline-flex items-center gap-1 rounded-md border border-cobalt-200 bg-cobalt-50/40 px-2.5 py-1 text-xs font-medium text-cobalt-700 hover:bg-cobalt-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiSuggestLoading ? "Generating…" : "Generate AI suggestion"}
            </button>
          )}
        </div>
        <textarea
          value={peerComments}
          onChange={(e) => setPeerComments(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
          placeholder="Any additional commentary for this case..."
        />
        {aiSuggestError && (
          <p className="mt-2 text-xs text-critical-700">{aiSuggestError}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-critical-100 bg-critical-50 p-3 text-sm text-critical-700">
          {error}
        </div>
      )}

      {/* Submit footer — relative + z-30 keeps it above the floating Ask Ash bubble */}
      <div className="sticky bottom-4 relative z-30 rounded-xl border border-ink-200 bg-paper-surface/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="text-code text-ink-500">
            Case: {caseId.slice(0, 8)}… · Peer: {peerId.slice(0, 8)}…
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting…
              </>
            ) : (
              "Submit Review"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
