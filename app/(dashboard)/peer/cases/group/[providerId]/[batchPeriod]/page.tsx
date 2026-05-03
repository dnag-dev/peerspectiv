import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { reviewCases, providers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { renderPeerCaseDetail } from "../../../[id]/page";
import { GroupCaseTabs } from "./tabs-client";

export const dynamic = "force-dynamic";

interface GroupParams {
  params: Promise<{ providerId: string; batchPeriod: string }>;
}

// Section F1: tabbed detail page for a (provider, batch_period) pair when more
// than one chart is assigned to the same peer for that provider in that
// quarter. Each tab embeds the existing per-case detail content via the
// extracted renderPeerCaseDetail() helper.
export default async function PeerCaseGroupPage({ params }: GroupParams) {
  const { providerId, batchPeriod: batchPeriodRaw } = await params;
  const batchPeriod = decodeURIComponent(batchPeriodRaw);

  // Pull all sibling cases for this provider + batch_period.
  const cases = await db
    .select({
      id: reviewCases.id,
      encounterDate: reviewCases.encounterDate,
      status: reviewCases.status,
      chartFileName: reviewCases.chartFileName,
      createdAt: reviewCases.createdAt,
    })
    .from(reviewCases)
    .where(
      and(
        eq(reviewCases.providerId, providerId),
        eq(reviewCases.batchPeriod, batchPeriod)
      )
    )
    .orderBy(reviewCases.encounterDate);

  if (cases.length === 0) {
    notFound();
  }

  // If only one chart matched, just redirect-style render the single page.
  if (cases.length === 1) {
    return renderPeerCaseDetail(cases[0].id);
  }

  const [providerRow] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);
  const providerName = providerRow
    ? `${providerRow.firstName ?? ""} ${providerRow.lastName ?? ""}`.trim() ||
      "Unknown Provider"
    : "Unknown Provider";

  // Render every tab's detail content server-side up front — that way each tab
  // has its full (PDF viewer, AI summary, review form) contents ready and the
  // existing review-submit flow per-case continues to work unchanged.
  const tabContents = await Promise.all(
    cases.map(async (c) => ({
      id: c.id,
      label: c.encounterDate
        ? new Date(c.encounterDate).toLocaleDateString()
        : c.chartFileName ?? `Chart ${c.id.slice(0, 6)}`,
      status: c.status,
      content: await renderPeerCaseDetail(c.id),
    }))
  );

  return (
    <div className="flex flex-col bg-paper-canvas">
      <div className="flex-shrink-0 px-4 pt-4 lg:px-6 lg:pt-6">
        <div className="rounded-lg border border-cobalt-200 bg-cobalt-50/40 p-4">
          <div className="text-eyebrow text-cobalt-700">
            MULTI-CHART REVIEW
          </div>
          <h1 className="mt-1 text-lg font-semibold text-ink-900">
            {providerName}{" "}
            <span className="text-ink-500">· {batchPeriod}</span>{" "}
            <span className="text-ink-400">({cases.length} charts)</span>
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Each tab is an independent chart review. Submit each tab separately.
          </p>
        </div>
      </div>
      <GroupCaseTabs tabs={tabContents} />
    </div>
  );
}
