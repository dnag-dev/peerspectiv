"use client";

import { useState, useMemo, useCallback, useRef } from "react";

/* ──────────────────────── Types ──────────────────────── */

export type FieldType = "yes_no" | "rating" | "text";

export interface FormField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
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
  reviewer_comments: string;
}

interface ReviewFormProps {
  caseId: string;
  reviewerId: string;
  formFields: FormField[];
  aiPrefills?: Record<string, AIPrefill>;
  onSubmit?: (data: ReviewFormSubmitData) => Promise<void>;
}

interface FieldState {
  value: unknown;
  comment: string;
  touched: boolean;
}

/* ──────────────────────── Helpers ──────────────────────── */

function confidenceClasses(c: Confidence) {
  switch (c) {
    case "high":
      return "bg-mint-500/15 border-mint-500/40 text-mint-200";
    case "medium":
      return "bg-warning-600/15 border-warning-600/40 text-warning-600";
    case "low":
      return "bg-critical-600/15 border-critical-600/40 text-critical-600";
  }
}

function ratingLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 60) return "Acceptable";
  return "Below standard";
}

function ratingLabelColor(score: number): string {
  if (score >= 80) return "text-mint-400";
  if (score >= 60) return "text-warning-600";
  return "text-critical-600";
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
  reviewerId,
  formFields,
  aiPrefills = {},
  onSubmit,
}: ReviewFormProps) {
  const startedAt = useRef(Date.now());

  const sortedFields = useMemo(
    () => [...formFields].sort((a, b) => a.displayOrder - b.displayOrder),
    [formFields]
  );

  // Initialize each field's state from AI prefill (if any)
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

  const [reviewerComments, setReviewerComments] = useState("");
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
    if (field.fieldType === "yes_no") return value !== true && value !== false;
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

    // Validate required fields
    const missing = new Set<string>();
    for (const f of sortedFields) {
      if (f.isRequired && isEmpty(f, state[f.fieldKey]?.value)) {
        missing.add(f.fieldKey);
      }
    }
    if (missing.size > 0) {
      setMissingKeys(missing);
      setError(
        `Please complete ${missing.size} required field${missing.size === 1 ? "" : "s"} before submitting.`
      );
      return;
    }

    // Build payload
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

    const payload: ReviewFormSubmitData = {
      form_responses,
      reviewer_comments: reviewerComments,
    };

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        // Default: translate to /api/reviewer/submit shape
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
              score: Math.round(scaled / 25), // map 0-100 back to 0-4
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
          : reviewerComments;

        const res = await fetch("/api/reviewer/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_id: caseId,
            criteria_scores: criteriaScores,
            deficiencies: [],
            overall_score: overallScore,
            narrative_final: narrative.trim() || reviewerComments || "Reviewer submitted form.",
            time_spent_minutes: timeSpent,
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
      <div className="rounded-xl border border-mint-500/30 bg-mint-500/5 p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mint-500/20">
          <svg
            className="h-7 w-7 text-mint-400"
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
        <h2 className="text-xl font-semibold text-white">
          Review Submitted
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Your review has been saved successfully.
        </p>
      </div>
    );
  }

  if (sortedFields.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0F2040] p-10 text-center text-white/60">
        No form fields configured for this specialty.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0F2040] p-5">
        <h2 className="text-lg font-semibold text-white">Peer Review</h2>
        <p className="mt-1 text-sm text-white/60">
          Review each field below. AI prefills are shown with confidence
          indicators — override where your clinical judgment differs.
        </p>
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
            className={`rounded-xl border bg-[#0F2040] p-5 transition-colors ${
              isMissing
                ? "border-critical-600/60"
                : overridden
                  ? "border-warning-600/60"
                  : "border-white/10"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <label className="text-sm font-semibold text-white">
                  {field.fieldLabel}
                  {field.isRequired && (
                    <span className="ml-1 text-critical-600">*</span>
                  )}
                </label>
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
                            ? "bg-mint-400"
                            : prefill.confidence === "medium"
                              ? "bg-warning-600"
                              : "bg-critical-600"
                        }`}
                      />
                      AI {prefill.confidence}
                    </span>
                    {prefill.pageReference && (
                      <span className="text-[10px] text-white/40">
                        Ref: {prefill.pageReference}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {overridden && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning-600/40 bg-warning-600/15 px-2 py-0.5 text-[10px] font-medium text-warning-600">
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
                className="mb-3 text-xs italic leading-relaxed text-white/50"
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
                      ? "border-mint-500 bg-mint-500 text-white shadow-lg shadow-mint-500/20"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
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
                      ? "border-critical-600 bg-critical-600 text-white shadow-lg shadow-critical-600/20"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  No
                </button>
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
                    className="w-28 rounded-lg border border-white/15 bg-[#0B1829] px-3 py-2 text-sm text-white outline-none focus:border-[#1E4DB7] focus:ring-1 focus:ring-[#1E4DB7]"
                    placeholder="0-100"
                  />
                  <span className="text-xs text-white/40">/ 100</span>
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
                className="w-full resize-y rounded-lg border border-white/15 bg-[#0B1829] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#1E4DB7] focus:ring-1 focus:ring-[#1E4DB7]"
                placeholder="Enter your assessment..."
              />
            )}

            {/* Optional field-level comment */}
            <input
              type="text"
              value={fieldState.comment}
              onChange={(e) => setFieldComment(field.fieldKey, e.target.value)}
              placeholder="Add a comment (optional)"
              className="mt-3 w-full rounded-lg border border-white/10 bg-[#0B1829] px-3 py-2 text-xs text-white/80 placeholder:text-white/30 outline-none focus:border-[#1E4DB7]"
            />
          </div>
        );
      })}

      {/* Reviewer overall comments */}
      <div className="rounded-xl border border-white/10 bg-[#0F2040] p-5">
        <label className="mb-2 block text-sm font-semibold text-white">
          Overall Reviewer Comments
        </label>
        <textarea
          value={reviewerComments}
          onChange={(e) => setReviewerComments(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-white/15 bg-[#0B1829] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#1E4DB7] focus:ring-1 focus:ring-[#1E4DB7]"
          placeholder="Any additional commentary for this case..."
        />
      </div>

      {error && (
        <div className="rounded-lg border border-critical-600/40 bg-critical-600/10 p-3 text-sm text-critical-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="sticky bottom-4 rounded-xl border border-white/10 bg-[#0F2040]/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-white/50">
            Case: {caseId.slice(0, 8)}… · Reviewer: {reviewerId.slice(0, 8)}…
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E4DB7] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#1E4DB7]/20 transition-colors hover:bg-[#1E4DB7]/90 disabled:cursor-not-allowed disabled:opacity-50"
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
