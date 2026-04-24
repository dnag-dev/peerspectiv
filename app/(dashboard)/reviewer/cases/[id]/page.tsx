import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { query } from "@/lib/supabase/server";
import {
  reviewCases,
  aiAnalyses,
  providers,
  companies,
  batches,
  reviewers,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ReviewForm } from "@/components/reviewer/ReviewForm";
import { ChartViewerButton } from "@/components/reviewer/ChartViewerButton";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

interface FormField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: "yes_no" | "rating" | "text";
  isRequired: boolean;
  displayOrder: number;
}

interface RiskFlag {
  label: string;
  severity: "high" | "medium" | "low";
  description?: string;
}

interface AiPrefill {
  value: unknown;
  confidence: "high" | "medium" | "low";
  reasoning?: string;
  pageReference?: string;
}

// Load reviewer id either from Clerk or fall back to first available reviewer (demo mode).
async function resolveReviewerId(): Promise<string | null> {
  const isDemoMode =
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "pk_test_placeholder" ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "";

  if (!isDemoMode) {
    try {
      const { userId } = await auth();
      if (userId) {
        const rows = await query<{ id: string }>(
          "SELECT id FROM reviewers WHERE email = (SELECT email FROM user_profiles WHERE clerk_user_id = $1 LIMIT 1) LIMIT 1",
          [userId]
        ).catch(() => []);
        if (rows[0]?.id) return rows[0].id;
      }
    } catch {
      // fall through to demo
    }
  }

  const firstReviewer = await db.select().from(reviewers).limit(1);
  return firstReviewer[0]?.id ?? null;
}

async function loadFormFields(
  specialty: string | null,
  companyFormId: string | null
): Promise<FormField[]> {
  // Prefer the company-approved form (company_forms.form_fields jsonb)
  if (companyFormId) {
    try {
      const rows = await query<{ form_fields: unknown }>(
        `SELECT form_fields FROM company_forms WHERE id = $1 LIMIT 1`,
        [companyFormId]
      );
      const fields = rows[0]?.form_fields;
      if (Array.isArray(fields) && fields.length > 0) {
        return (fields as Array<{
          field_key: string;
          field_label: string;
          field_type: string;
          is_required?: boolean;
          display_order?: number;
        }>).map((r, idx) => ({
          id: `${companyFormId}-${idx}`,
          fieldKey: r.field_key,
          fieldLabel: r.field_label,
          fieldType: (["yes_no", "rating", "text"].includes(r.field_type)
            ? r.field_type
            : "text") as FormField["fieldType"],
          isRequired: !!r.is_required,
          displayOrder: r.display_order ?? idx,
        }));
      }
    } catch {
      // fall through to legacy lookup
    }
  }

  // Legacy fallback: global form_fields table filtered by specialty
  try {
    const rows = await query<{
      id: string;
      field_key: string;
      field_label: string;
      field_type: string;
      is_required: boolean;
      display_order: number;
    }>(
      `SELECT id, field_key, field_label, field_type, is_required, display_order
       FROM form_fields
       WHERE ($1::text IS NULL OR specialty = $1 OR specialty IS NULL)
       ORDER BY display_order ASC`,
      [specialty]
    );
    return rows.map((r) => ({
      id: r.id,
      fieldKey: r.field_key,
      fieldLabel: r.field_label,
      fieldType: (["yes_no", "rating", "text"].includes(r.field_type)
        ? r.field_type
        : "text") as FormField["fieldType"],
      isRequired: !!r.is_required,
      displayOrder: r.display_order ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function ReviewerCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = await params;

  // 1) Fetch the case
  const caseRows = await db
    .select()
    .from(reviewCases)
    .where(eq(reviewCases.id, caseId))
    .limit(1);
  const reviewCase = caseRows[0];
  if (!reviewCase) notFound();

  // 2) Joins — provider, company, batch
  const [providerRow] = reviewCase.providerId
    ? await db
        .select()
        .from(providers)
        .where(eq(providers.id, reviewCase.providerId))
        .limit(1)
    : [null];

  const [companyRow] = reviewCase.companyId
    ? await db
        .select()
        .from(companies)
        .where(eq(companies.id, reviewCase.companyId))
        .limit(1)
    : [null];

  const [batchRow] = reviewCase.batchId
    ? await db
        .select()
        .from(batches)
        .where(eq(batches.id, reviewCase.batchId))
        .limit(1)
    : [null];

  // 3) AI analysis — may not exist yet
  const [analysisRow] = await db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.caseId, caseId))
    .limit(1);

  // Extract risk_flags if present in the jsonb (schema may not yet have field)
  const rawAnalysis = analysisRow as (typeof analysisRow & {
    risk_flags?: RiskFlag[];
    riskFlags?: RiskFlag[];
  }) | undefined;

  const riskFlags: RiskFlag[] = Array.isArray(rawAnalysis?.risk_flags)
    ? (rawAnalysis!.risk_flags as RiskFlag[])
    : Array.isArray(rawAnalysis?.riskFlags)
      ? (rawAnalysis!.riskFlags as RiskFlag[])
      : Array.isArray(analysisRow?.deficiencies)
        ? (analysisRow!.deficiencies as Array<{
            description: string;
            severity?: string;
          }>).map((d) => ({
            label: d.description?.slice(0, 80) ?? "Deficiency",
            severity: (d.severity === "Major"
              ? "high"
              : d.severity === "Moderate"
                ? "medium"
                : "low") as RiskFlag["severity"],
          }))
        : [];

  // 4) Form fields — specialty filter
  const specialty = providerRow?.specialty ?? reviewCase.specialtyRequired ?? null;
  const companyFormId =
    (reviewCase as unknown as { companyFormId?: string | null }).companyFormId ??
    (batchRow as unknown as { companyFormId?: string | null })?.companyFormId ??
    null;
  let formFields = await loadFormFields(specialty, companyFormId);

  // Fallback: derive form fields from AI criteria_scores if form_fields table empty
  if (formFields.length === 0 && Array.isArray(analysisRow?.criteriaScores)) {
    const aiCriteria = analysisRow!.criteriaScores as Array<{
      criterion: string;
      score_label?: string;
    }>;
    formFields = aiCriteria.map((c, idx) => ({
      id: `derived-${idx}`,
      fieldKey: c.criterion
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, ""),
      fieldLabel: c.criterion,
      fieldType: "rating" as const,
      isRequired: true,
      displayOrder: idx,
    }));
    // Add narrative field at the end
    formFields.push({
      id: "derived-narrative",
      fieldKey: "narrative_final",
      fieldLabel: "Review Narrative",
      fieldType: "text",
      isRequired: true,
      displayOrder: formFields.length,
    });
  }

  // 5) Build AI prefills from criteriaScores
  const aiPrefills: Record<string, AiPrefill> = {};
  if (Array.isArray(analysisRow?.criteriaScores)) {
    const aiCriteria = analysisRow!.criteriaScores as Array<{
      criterion: string;
      score?: number;
      score_label?: string;
      rationale?: string;
      ai_flag?: boolean;
    }>;
    for (const c of aiCriteria) {
      const key = c.criterion
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      // Map AI score (0-4 scale typical) to 0-100 rating
      const ratingValue =
        typeof c.score === "number" ? Math.round(c.score * 25) : undefined;
      aiPrefills[key] = {
        value: ratingValue ?? c.score_label ?? "",
        confidence: c.ai_flag ? "low" : ratingValue != null && ratingValue >= 75 ? "high" : "medium",
        reasoning: c.rationale,
      };
    }
  }
  if (analysisRow?.narrativeDraft) {
    aiPrefills["narrative_final"] = {
      value: analysisRow.narrativeDraft,
      confidence: "medium",
      reasoning: "AI-drafted narrative based on chart analysis.",
    };
  }

  // 6) Reviewer id
  const reviewerId = reviewCase.reviewerId ?? (await resolveReviewerId()) ?? "";

  // chartFilePath is a public Vercel Blob URL — use it directly (no proxy route needed).
  const chartViewUrl = reviewCase.chartFilePath || null;

  return (
    <div className="min-h-screen bg-[#0B1829] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        {/* ─── Left Panel ─── */}
        <aside className="w-full flex-shrink-0 space-y-4 lg:w-[340px]">
          {/* Provider / Company Card */}
          <div className="rounded-xl border border-white/10 bg-[#0F2040] p-5">
            <div className="text-xs uppercase tracking-wide text-white/40">
              Provider
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {providerRow
                ? `${providerRow.firstName ?? ""} ${providerRow.lastName ?? ""}`.trim() ||
                  "Unknown Provider"
                : "Unknown Provider"}
            </h1>
            {providerRow?.specialty && (
              <span className="mt-2 inline-flex items-center rounded-full border border-[#0EA5A5]/40 bg-[#0EA5A5]/10 px-3 py-1 text-xs font-medium text-[#5EEAD4]">
                {providerRow.specialty}
              </span>
            )}
            <div className="mt-4 space-y-1 text-sm text-white/60">
              {companyRow?.name && <div>{companyRow.name}</div>}
              {batchRow?.batchName && (
                <div className="text-xs text-white/40">
                  Batch: {batchRow.batchName}
                </div>
              )}
              {reviewCase.encounterDate && (
                <div className="text-xs text-white/40">
                  Encounter:{" "}
                  {new Date(reviewCase.encounterDate).toLocaleDateString()}
                </div>
              )}
              {reviewCase.chartPages != null && (
                <div className="text-xs text-white/40">
                  {reviewCase.chartPages} pages
                </div>
              )}
            </div>
          </div>

          {/* Chart Summary Card */}
          <div
            data-testid="chart-summary"
            className="rounded-xl border border-white/10 bg-[#0F2040] p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-xs font-bold text-white">
                A
              </span>
              <h2 className="text-sm font-semibold text-white">
                Chart Summary — Ash
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              {analysisRow?.chartSummary ?? "AI analysis pending..."}
            </p>
          </div>

          {/* Risk Flags Card */}
          <div className="rounded-xl border border-white/10 bg-[#0F2040] p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">
              Risk Flags
            </h2>
            {riskFlags.length === 0 ? (
              <p className="text-xs text-white/40">No risk flags identified.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {riskFlags.map((flag, i) => {
                  const sev = flag.severity;
                  const classes =
                    sev === "high"
                      ? "bg-red-500/15 border-red-500/40 text-red-300"
                      : sev === "medium"
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-blue-500/15 border-blue-500/40 text-blue-300";
                  return (
                    <span
                      key={i}
                      data-testid="risk-flag"
                      data-severity={sev}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
                      title={flag.description}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          sev === "high"
                            ? "bg-red-400"
                            : sev === "medium"
                              ? "bg-amber-400"
                              : "bg-blue-400"
                        }`}
                      />
                      {flag.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* View Chart Button */}
          {chartViewUrl ? (
            <ChartViewerButton url={chartViewUrl} />
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-white/40">
              No chart file available
            </div>
          )}
        </aside>

        {/* ─── Right Panel ─── */}
        <main className="min-w-0 flex-1">
          <ReviewForm
            caseId={caseId}
            reviewerId={reviewerId}
            formFields={formFields}
            aiPrefills={aiPrefills}
          />
        </main>
      </div>
    </div>
  );
}
