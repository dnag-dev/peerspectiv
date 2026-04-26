import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentQueue } from "@/components/assign/AssignmentQueue";
import { Layers, Inbox } from "lucide-react";
import type { ReviewCase, Reviewer, Provider, Company } from "@/types";

export const dynamic = 'force-dynamic';

interface PendingCase extends ReviewCase {
  provider: NonNullable<ReviewCase["provider"]>;
  reviewer: NonNullable<ReviewCase["reviewer"]>;
  company: NonNullable<ReviewCase["company"]>;
}

async function getPendingCases(): Promise<PendingCase[]> {
  const { data, error } = await supabaseAdmin
    .from("review_cases")
    .select(
      `
      *,
      provider:providers(id, first_name, last_name, specialty, npi, email),
      reviewer:reviewers(id, full_name, email, specialty, board_certification, active_cases_count, total_reviews_completed, ai_agreement_score, status),
      company:companies(id, name, contact_person, contact_email)
    `
    )
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[assign] Failed to fetch pending cases:", error);
    return [];
  }

  return (data || [])
    .filter(
      (c: any) => c.provider && c.reviewer && c.company
    )
    .map((c: any) => ({
      ...c,
      provider: c.provider as unknown as Provider,
      reviewer: c.reviewer as unknown as Reviewer,
      company: c.company as unknown as Company,
    })) as PendingCase[];
}

async function getAlternateReviewers(
  cases: PendingCase[]
): Promise<Record<string, Reviewer[]>> {
  const result: Record<string, Reviewer[]> = {};

  const specialtySet = new Set<string>();
  const currentReviewerIds = new Set<string>();
  for (const c of cases) {
    const spec = c.specialty_required || c.provider.specialty;
    if (spec) specialtySet.add(spec);
    currentReviewerIds.add(c.reviewer.id);
  }

  if (specialtySet.size === 0) return result;

  const { data: reviewers } = await supabaseAdmin
    .from("reviewers")
    .select("*")
    .eq("status", "active")
    .in("specialty", Array.from(specialtySet))
    .order("active_cases_count", { ascending: true })
    .limit(50);

  if (!reviewers) return result;

  for (const c of cases) {
    const neededSpecialty = c.specialty_required || c.provider.specialty;
    result[c.id] = (reviewers as Reviewer[]).filter(
      (r) => r.id !== c.reviewer.id && r.specialty === neededSpecialty
    );
  }

  return result;
}

async function getApprovedTodayCount(): Promise<number> {
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabaseAdmin
    .from("review_cases")
    .select("id, status, updated_at")
    .gte("updated_at", startOfDayUtc.toISOString())
    .in("status", ["assigned", "in_progress", "completed", "past_due"]);
  if (error) return 0;
  return (data ?? []).length;
}

export default async function AssignPage() {
  const pendingCases = await getPendingCases();
  const alternateReviewers = await getAlternateReviewers(pendingCases);
  const approvedToday = await getApprovedTodayCount();

  // Avg match across the pending queue (parsed from notes.confidence)
  const confidences = pendingCases
    .map((c) => {
      try {
        const parsed = c.notes ? JSON.parse(c.notes) : null;
        return typeof parsed?.confidence === "number" ? parsed.confidence : 85;
      } catch {
        return 85;
      }
    })
    .filter((v): v is number => Number.isFinite(v));
  const avgMatch =
    confidences.length > 0
      ? Math.round(confidences.reduce((s, v) => s + v, 0) / confidences.length)
      : null;

  const monitoringCount = new Set(
    pendingCases.map((c) => c.batch_id).filter(Boolean)
  ).size;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <div className="text-eyebrow text-ink-500 mb-1">
          ADMIN · ASSIGNMENT WORKFLOW
        </div>
        <h1 className="text-h1 text-ink-900">AI assignment queue</h1>
        <p className="mt-1 text-small text-ink-500">
          Review and approve Ash&apos;s reviewer assignments before they go live.
        </p>
      </div>

      {/* Stat strip */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-ink-200 bg-paper-surface px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-5">
          <StatBlock label="Pending" value={pendingCases.length.toString()} />
          <span className="w-px h-8 bg-ink-200" />
          <StatBlock label="Approved today" value={approvedToday.toString()} />
          <span className="w-px h-8 bg-ink-200" />
          <StatBlock
            label="Avg match"
            value={avgMatch != null ? `${avgMatch}%` : "—"}
            valueClassName="text-cobalt-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-mint-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-600" />
          </span>
          <span className="text-code text-ink-600">
            Ash is monitoring {monitoringCount} {monitoringCount === 1 ? "batch" : "batches"}
          </span>
        </div>
      </div>

      {/* Queue content */}
      {pendingCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-4 h-12 w-12 text-ink-400" />
            <h3 className="text-h3 text-ink-900">No pending assignments</h3>
            <p className="mt-1 max-w-sm text-small text-ink-500">
              All AI-suggested assignments have been reviewed. Check the batches
              page to trigger new assignments.
            </p>
            <Link
              href="/batches"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cobalt-700 hover:underline"
            >
              <Layers className="h-4 w-4" />
              Go to Batches
            </Link>
          </CardContent>
        </Card>
      ) : (
        <AssignmentQueue
          pendingCases={pendingCases}
          alternateReviewers={alternateReviewers}
        />
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <div className="text-eyebrow text-ink-500">{label}</div>
      <div className={`text-h2 font-medium text-ink-900 ${valueClassName ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

