"use client";

// TODO Section F8: when company.tier !== 'white_glove', gate prefill behind a
// per-form allow_ai_prefill flag. See docs/product-roadmap.md.

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { AttestationBlock } from "@/components/peer/AttestationBlock";

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
  // Phase 6.2 — per-question form default (rendered as a low-confidence
  // "default" badge when AI has no prefill for this field).
  defaultAnswer?: "yes" | "no" | "A" | "B" | "C" | null;
  isCritical?: boolean;
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
  /** PR-036 — manual | ai_extracted | corrected. */
  mrn_source?: "manual" | "ai_extracted" | "corrected";
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
  /** mrn_source from review_cases (Phase 2). When 'ai_extracted', edits flip
   *  to 'corrected' on submit per PR-036. */
  initialMrnSource?: "manual" | "ai_extracted" | "corrected" | null;
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
      return "bg-mint-50 border-status-success-fg/30 text-status-success-fg";
    case "medium":
      return "bg-amber-50 border-amber-100 text-status-warning-fg";
    case "low":
      return "bg-critical-50 border-status-danger-fg/20 text-status-danger-fg";
  }
}

function ratingLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 60) return "Acceptable";
  return "Below standard";
}

// Light-surface rating label colors.
function ratingLabelColor(score: number): string {
  if (score >= 80) return "text-status-success-fg";
  if (score >= 60) return "text-status-warning-fg";
  return "text-status-danger-fg";
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
  initialMrnSource,
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
  // PR-036: track edits against the AI-extracted value. If the peer changes
  // an AI-extracted MRN, source flips to 'corrected' at submit time.
  const initialMrnRef = useRef<string>(initialMrnNumber ?? "");
  const initialMrnSourceRef = useRef<typeof initialMrnSource>(initialMrnSource ?? null);
  const effectiveMrnSource: "manual" | "ai_extracted" | "corrected" | null = (() => {
    const src = initialMrnSourceRef.current;
    if (src === "ai_extracted") {
      return mrnNumber.trim() !== initialMrnRef.current.trim() ? "corrected" : "ai_extracted";
    }
    if (src === "corrected") return "corrected";
    if (src === "manual") return "manual";
    // No source recorded yet — treat any non-empty value as manual.
    return mrnNumber.trim() ? "manual" : null;
  })();
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

  // Phase 6.2 — prefill priority: AI value (when present) → form default_answer
  // → empty. The "source" map drives a per-field badge ("AI" / "default" / "").
  function defaultAnswerToValue(
    f: FormField
  ): unknown {
    const da = f.defaultAnswer;
    if (!da) return undefined;
    if (f.fieldType === "yes_no") {
      if (da === "yes") return true;
      if (da === "no") return false;
    }
    // For A/B/C scoring (rendered as field_type yes_no in the UI today) we
    // just stash the letter as the value — peer can flip it.
    if (da === "A" || da === "B" || da === "C") return da;
    return undefined;
  }

  const initialSources = useMemo(() => {
    const out: Record<string, "ai" | "default" | "empty"> = {};
    for (const f of sortedFields) {
      if (aiPrefills[f.fieldKey] !== undefined) out[f.fieldKey] = "ai";
      else if (defaultAnswerToValue(f) !== undefined) out[f.fieldKey] = "default";
      else out[f.fieldKey] = "empty";
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFields, aiPrefills]);

  const [state, setState] = useState<Record<string, FieldState>>(() => {
    const s: Record<string, FieldState> = {};
    for (const f of sortedFields) {
      const prefill = aiPrefills[f.fieldKey];
      let value: unknown;
      if (prefill !== undefined) {
        value = prefill.value;
      } else {
        const fromDefault = defaultAnswerToValue(f);
        value =
          fromDefault !== undefined
            ? fromDefault
            : f.fieldType === "yes_no"
              ? null
              : "";
      }
      s[f.fieldKey] = { value, comment: "", touched: false };
    }
    return s;
  });

  const [peerComments, setPeerComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set());
  const [draftSaved, setDraftSaved] = useState(false);

  // PR-014: Load draft from localStorage on mount.
  // HIPAA: Only non-PHI data stored (form answers + comments). MRN, license
  // number, and license state are NOT persisted to localStorage.
  const draftKey = `peerspectiv.draft.${caseId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.state) setState(draft.state);
      if (draft.peerComments) setPeerComments(draft.peerComments);
    } catch { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PR-014: Auto-save draft to localStorage on field changes (debounced).
  // HIPAA: Only QA answers and general comments saved — no PHI (MRN, license).
  useEffect(() => {
    if (submitted) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          state,
          peerComments,
        }));
      } catch { /* storage full or unavailable */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [state, peerComments, draftKey, submitted]);

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
      mrn_source: effectiveMrnSource ?? "manual",
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
            mrn_source: effectiveMrnSource ?? "manual",
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
      // PR-014: Clear draft on successful submit
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-status-success-fg/30 bg-mint-50 p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mint-100">
          <svg
            className="h-7 w-7 text-status-success-fg"
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
        <h2 className="text-h2 text-ink-primary">Review Submitted</h2>
        <p className="mt-2 text-small text-ink-secondary">
          Your review has been saved successfully.
        </p>
      </div>
    );
  }

  if (sortedFields.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-card p-10 text-center text-ink-secondary">
        No form fields configured for this specialty.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      {/* TODO Section F8: gate prefill rendering behind allow_ai_prefill flag
          when company.tier !== 'white_glove'. See docs/product-roadmap.md. */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-eyebrow text-ink-secondary">PEER · ASSESSMENT</div>
            <h2 className="mt-1 text-h2 text-ink-primary">Peer Review</h2>
            <p className="mt-1 text-small text-ink-secondary">
              Review each field below. AI prefills are shown with confidence
              indicators — override where your clinical judgment differs.
            </p>
          </div>
          {/* Section F5: hover-to-jump toggle. */}
          {onFieldHover && (
            <label className="flex flex-shrink-0 items-center gap-2 text-xs text-ink-secondary">
              <input
                type="checkbox"
                data-testid="hover-jump-toggle"
                checked={hoverJumpEnabled}
                onChange={(e) => setHoverJumpEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border-default text-status-info-fg focus:ring-brand/30"
              />
              Highlight on hover
            </label>
          )}
        </div>
      </div>

      {/* ── System Attestation Block (Phase 2 — PR-035/036/037/039) ── */}
      <AttestationBlock
        mrn={mrnNumber}
        onMrnChange={setMrnNumber}
        mrnSource={effectiveMrnSource}
        peerName={peerLicense?.fullName ?? ""}
        licenseNumber={peerLicense?.licenseNumber ?? ""}
        licenseState={peerLicense?.licenseState ?? ""}
      />

      {/* ── License attestation (HRSA audit) ── */}
      <div
        data-testid="license-attestation"
        className="rounded-xl border-2 border-status-info-fg/30 bg-status-info-bg/40 p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-eyebrow text-status-info-fg">
              PEER · LICENSE ATTESTATION
            </div>
            <h3 className="mt-1 text-base font-medium text-ink-primary">
              You are reviewing this case as:{" "}
              <span className="text-status-info-fg">
                {peerLicense?.fullName ?? "Peer"}
                {peerLicense?.credential ? `, ${peerLicense.credential}` : ""}
              </span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              Your responses below will be permanently attached to this license
              for HRSA audit. Verify your license details before submitting.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-status-info-fg/30 bg-surface-card px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wide text-status-info-fg">
            Required
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-primary">
              License #
            </label>
            <input
              type="text"
              data-testid="license-number-input"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. MD123456"
              className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-status-info-fg focus:ring-1 focus:ring-brand/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-primary">
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
              className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm uppercase text-ink-primary outline-none focus:border-status-info-fg focus:ring-1 focus:ring-brand/30"
            />
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-primary">
          <input
            type="checkbox"
            data-testid="license-attest-checkbox"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-border-default text-status-info-fg focus:ring-brand/30"
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
            className={`rounded-xl border bg-surface-card p-5 transition-colors ${
              isMissing
                ? "border-status-danger-fg/20 ring-1 ring-critical-100"
                : overridden
                  ? "border-amber-100"
                  : "border-border-subtle"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-ink-primary">
                  {field.fieldLabel}
                  {field.isRequired && (
                    <span className="rounded-full bg-status-info-bg px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wide text-status-info-fg">
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
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${confidenceClasses(
                        prefill.confidence
                      )}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          prefill.confidence === "high"
                            ? "bg-status-success-dot"
                            : prefill.confidence === "medium"
                              ? "bg-status-warning-dot"
                              : "bg-status-danger-dot"
                        }`}
                      />
                      AI {prefill.confidence}
                    </span>
                    {prefill.pageReference && (
                      <span className="text-[10px] text-ink-tertiary">
                        Ref: {prefill.pageReference}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {overridden && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-status-warning-fg">
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
                className="mb-3 text-xs italic leading-relaxed text-ink-secondary"
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
                      ? "border-status-info-fg bg-brand-hover text-white"
                      : "border-border-subtle bg-surface-card text-ink-primary hover:bg-ink-50"
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
                      : "border-border-subtle bg-surface-card text-ink-primary hover:bg-ink-50"
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
                        ? "border-ink-400 bg-ink-100 text-ink-primary"
                        : "border-border-subtle bg-surface-card text-ink-primary hover:bg-ink-50"
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
                    className="w-28 rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-status-info-fg focus:ring-1 focus:ring-brand/30"
                    placeholder="0-100"
                  />
                  <span className="text-xs text-ink-tertiary">/ 100</span>
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
                className="w-full resize-y rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-status-info-fg focus:ring-1 focus:ring-brand/30"
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
                  className={`mt-3 w-full resize-y rounded-lg border bg-surface-card px-3 py-2 text-xs text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-status-info-fg ${
                    commentRequired
                      ? "border-amber-300 ring-1 ring-amber-100"
                      : "border-border-subtle"
                  }`}
                />
              );
            })()}
          </div>
        );
      })}

      {/* Peer overall comments */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-sm font-medium text-ink-primary">
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
              className="inline-flex items-center gap-1 rounded-md border border-status-info-fg/30 bg-status-info-bg/40 px-2.5 py-1 text-xs font-medium text-status-info-fg hover:bg-status-info-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiSuggestLoading ? "Generating…" : "Generate AI suggestion"}
            </button>
          )}
        </div>
        <textarea
          value={peerComments}
          onChange={(e) => setPeerComments(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-status-info-fg focus:ring-1 focus:ring-brand/30"
          placeholder="Any additional commentary for this case..."
        />
        {aiSuggestError && (
          <p className="mt-2 text-xs text-status-danger-fg">{aiSuggestError}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-status-danger-fg/20 bg-critical-50 p-3 text-sm text-status-danger-fg">
          {error}
        </div>
      )}

      {/* Submit footer — relative + z-30 keeps it above the floating Ask Ash bubble */}
      <div className="sticky bottom-4 relative z-30 rounded-xl border border-border-subtle bg-surface-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setDraftSaved(true);
                setTimeout(() => setDraftSaved(false), 2000);
                window.location.href = "/peer/portal";
              }}
              className="rounded-md border border-border-default bg-white px-3 py-1.5 text-sm text-ink-primary hover:bg-ink-50"
            >
              {draftSaved ? "Saved!" : "Save & Exit"}
            </button>
            <span className="text-code text-ink-secondary">
              Case: {caseId.slice(0, 8)}…
            </span>
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
