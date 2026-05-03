import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  reviewCases,
  aiAnalyses,
  providers,
  companies,
  batches,
  peers,
  reviewResults,
  companyForms,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { PeerCaseSplit } from "@/components/peer/PeerCaseSplit";
import { RequestReassignmentButton } from "@/components/peer/RequestReassignmentButton";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

interface FormField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: "yes_no" | "rating" | "text";
  isRequired: boolean;
  displayOrder: number;
  allowNa?: boolean;
  defaultValue?: "yes" | "no" | "na" | null;
  requiredTextOnNonDefault?: boolean;
  opsTerm?: string | null;
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

// Load peer id either from Clerk or fall back to first available peer (demo mode).
async function resolvePeerId(): Promise<string | null> {
  const isDemoMode =
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "pk_test_placeholder" ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "";

  if (!isDemoMode) {
    try {
      const { userId } = await auth();
      if (userId) {
        // user_profiles isn't modeled in the Drizzle schema — use raw SQL.
        const rows = await db
          .execute<{ id: string }>(
            sql`SELECT id FROM peers WHERE email = (SELECT email FROM user_profiles WHERE clerk_user_id = ${userId} LIMIT 1) LIMIT 1`
          )
          .catch(() => ({ rows: [] as { id: string }[] }) as any);
        const list = (rows as any).rows ?? rows;
        if (list[0]?.id) return list[0].id as string;
      }
    } catch {
      // fall through to demo
    }
  }

  const firstPeer = await db.select().from(peers).limit(1);
  return firstPeer[0]?.id ?? null;
}

async function loadFormFields(
  specialty: string | null,
  companyFormId: string | null
): Promise<FormField[]> {
  // Prefer the company-approved form (company_forms.form_fields jsonb)
  if (companyFormId) {
    try {
      const rows = await db
        .select({ form_fields: companyForms.formFields })
        .from(companyForms)
        .where(eq(companyForms.id, companyFormId))
        .limit(1);
      const fields = rows[0]?.form_fields;
      if (Array.isArray(fields) && fields.length > 0) {
        return (fields as Array<{
          field_key: string;
          field_label: string;
          field_type: string;
          is_required?: boolean;
          display_order?: number;
          allow_na?: boolean;
          default_value?: "yes" | "no" | "na" | null;
          required_text_on_non_default?: boolean;
          ops_term?: string | null;
        }>).map((r, idx) => ({
          id: `${companyFormId}-${idx}`,
          fieldKey: r.field_key,
          fieldLabel: r.field_label,
          fieldType: (["yes_no", "rating", "text"].includes(r.field_type)
            ? r.field_type
            : "text") as FormField["fieldType"],
          isRequired: !!r.is_required,
          displayOrder: r.display_order ?? idx,
          // Section C metadata — defaults applied on read.
          allowNa: r.allow_na ?? false,
          defaultValue: r.default_value ?? null,
          requiredTextOnNonDefault: r.required_text_on_non_default ?? false,
          opsTerm: r.ops_term ?? null,
        }));
      }
    } catch {
      // fall through to legacy lookup
    }
  }

  // Legacy fallback: global form_fields table filtered by specialty
  try {
    const result = await db.execute<{
      id: string;
      field_key: string;
      field_label: string;
      field_type: string;
      is_required: boolean;
      display_order: number;
    }>(sql`SELECT id, field_key, field_label, field_type, is_required, display_order
       FROM form_fields
       WHERE (${specialty}::text IS NULL OR specialty = ${specialty} OR specialty IS NULL)
       ORDER BY display_order ASC`);
    const rows = ((result as any).rows ?? result) as Array<{
      id: string;
      field_key: string;
      field_label: string;
      field_type: string;
      is_required: boolean;
      display_order: number;
    }>;
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

// Section F1: extracted so the group/[providerId]/[batchPeriod] tabbed page
// can render the same per-case detail content inside a tab without
// duplicating all the data-loading + AI-prefill assembly logic.
export async function renderPeerCaseDetail(caseId: string) {
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

  // 3b) Already-submitted check — if a review_results row exists, lock the page.
  const [existingResult] = await db
    .select()
    .from(reviewResults)
    .where(eq(reviewResults.caseId, caseId))
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

  // Section C.5 — pull the form-level allow_ai_generated_recommendations flag.
  let allowAiNarrative = false;
  if (companyFormId) {
    try {
      const flagRows = await db
        .select({ allow_ai_generated_recommendations: companyForms.allowAiGeneratedRecommendations })
        .from(companyForms)
        .where(eq(companyForms.id, companyFormId))
        .limit(1);
      allowAiNarrative = !!flagRows[0]?.allow_ai_generated_recommendations;
    } catch {
      // default false
    }
  }

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

  // 6) Peer id
  const peerId = reviewCase.peerId ?? (await resolvePeerId()) ?? "";

  // 6b) Peer license info (HRSA attestation prefill)
  let peerLicense:
    | { fullName: string | null; credential: string | null; licenseNumber: string | null; licenseState: string | null }
    | undefined;
  if (peerId) {
    const [peerRow] = await db
      .select({
        fullName: peers.fullName,
        boardCertification: peers.boardCertification,
        licenseNumber: peers.licenseNumber,
        licenseState: peers.licenseState,
      })
      .from(peers)
      .where(eq(peers.id, peerId))
      .limit(1);
    if (peerRow) {
      peerLicense = {
        fullName: peerRow.fullName,
        credential: peerRow.boardCertification,
        licenseNumber: peerRow.licenseNumber,
        licenseState: peerRow.licenseState,
      };
    }
  }

  // chartFilePath is a public Vercel Blob URL — use it directly (no proxy route needed).
  const chartViewUrl = reviewCase.chartFilePath || null;

  // Build the case context header bits
  const providerName = providerRow
    ? `${providerRow.firstName ?? ""} ${providerRow.lastName ?? ""}`.trim() ||
      "Unknown Provider"
    : "Unknown Provider";
  const dueDateObj = reviewCase.dueDate ? new Date(reviewCase.dueDate) : null;
  const daysUntilDue = dueDateObj
    ? Math.ceil(
        (dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;
  const dueColorClass =
    daysUntilDue == null
      ? "border-ink-200 bg-paper-surface text-ink-600"
      : daysUntilDue < 0
        ? "border-critical-100 bg-critical-50 text-critical-700"
        : daysUntilDue <= 2
          ? "border-amber-100 bg-amber-50 text-amber-700"
          : "border-ink-200 bg-paper-surface text-ink-700";
  const dueLabel =
    daysUntilDue == null
      ? "No due date"
      : daysUntilDue < 0
        ? `Overdue by ${Math.abs(daysUntilDue)}d`
        : daysUntilDue === 0
          ? "Due today"
          : `Due in ${daysUntilDue}d`;
  const caseRefShort = caseId.slice(0, 8);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-paper-canvas text-ink-900">
      {/* ─── Full-width Case Context Header ─── */}
      <div className="flex-shrink-0 px-4 pt-4 lg:px-6 lg:pt-6">
        <div className="rounded-lg border border-ink-200 bg-paper-surface p-4 lg:p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <div className="text-eyebrow text-ink-500">
                Provider
              </div>
              <div className="text-lg font-semibold text-ink-900">{providerName}</div>
            </div>
            {providerRow?.specialty && (
              <div>
                <div className="text-eyebrow text-ink-500">
                  Specialty
                </div>
                <span className="mt-0.5 inline-flex items-center rounded-full border border-mint-200 bg-mint-50 px-2.5 py-0.5 text-xs font-medium text-mint-700">
                  {providerRow.specialty}
                </span>
              </div>
            )}
            {companyRow?.name && (
              <div>
                <div className="text-eyebrow text-ink-500">
                  Company
                </div>
                <div className="text-sm font-medium text-ink-900">{companyRow.name}</div>
              </div>
            )}
            {batchRow?.batchName && (
              <div>
                <div className="text-eyebrow text-ink-500">
                  Batch
                </div>
                <div className="text-sm text-ink-900">
                  {batchRow.batchName}
                  {reviewCase.batchPeriod ? ` · ${reviewCase.batchPeriod}` : ""}
                </div>
              </div>
            )}
            {reviewCase.encounterDate && (
              <div>
                <div className="text-eyebrow text-ink-500">
                  Encounter
                </div>
                <div className="text-sm text-ink-900">
                  {new Date(reviewCase.encounterDate).toLocaleDateString()}
                </div>
              </div>
            )}
            <div>
              <div className="text-eyebrow text-ink-500">
                Case Ref
              </div>
              <div className="font-mono text-xs text-ink-600">
                #{caseRefShort}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <RequestReassignmentButton
                caseId={caseId}
                alreadyRequested={
                  (reviewCase as unknown as { reassignmentRequested?: boolean })
                    .reassignmentRequested === true
                }
              />
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${dueColorClass}`}
              >
                {dueLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Resizable split: [Ash|Chart tabs] · [Review form] ─── */}
      <div className="flex min-h-0 flex-1 p-4 lg:p-6">
        <PeerCaseSplit
          chartViewUrl={chartViewUrl}
          chartFileName={reviewCase.chartFileName ?? null}
          chartSummary={analysisRow?.chartSummary ?? null}
          riskFlags={riskFlags}
          caseId={caseId}
          peerId={peerId}
          formFields={formFields}
          aiPrefills={aiPrefills}
          existingResult={
            existingResult
              ? {
                  submittedAt: existingResult.submittedAt,
                  overallScore: existingResult.overallScore,
                  narrativeFinal: existingResult.narrativeFinal,
                }
              : null
          }
          peerLicense={peerLicense}
          initialMrnNumber={(reviewCase as unknown as { mrnNumber?: string | null }).mrnNumber ?? null}
          initialMrnSource={
            ((reviewCase as unknown as { mrnSource?: string | null }).mrnSource ?? null) as
              | "manual"
              | "ai_extracted"
              | "corrected"
              | null
          }
          allowAiNarrative={allowAiNarrative}
          chartTextExtracted={analysisRow?.chartTextExtracted ?? null}
        />
      </div>
    </div>
  );
}

export default async function PeerCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = await params;
  return renderPeerCaseDetail(caseId);
}
