import { db } from "@/lib/db";
import { reviewResults, reviewCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { TrendsCharts } from "./TrendsCharts";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const company = await getDemoCompany();

  const rows = await db
    .select({
      score: reviewResults.overallScore,
      submittedAt: reviewResults.submittedAt,
      deficiencies: reviewResults.deficiencies,
    })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.companyId, company.id));

  // Bucket by month — last 6 months
  const now = new Date();
  const months: Array<{ key: string; label: string; scores: number[] }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    months.push({
      key,
      label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      scores: [],
    });
  }
  for (const r of rows) {
    if (!r.submittedAt || r.score == null) continue;
    const d = new Date(r.submittedAt as any);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) m.scores.push(r.score);
  }
  const monthly = months.map((m) => ({
    label: m.label,
    avg:
      m.scores.length > 0
        ? Math.round(m.scores.reduce((a, b) => a + b, 0) / m.scores.length)
        : 0,
    count: m.scores.length,
  }));

  // Top missed criteria
  const defCount = new Map<string, number>();
  for (const r of rows) {
    const d = r.deficiencies as any;
    if (Array.isArray(d)) {
      for (const item of d) {
        const key =
          typeof item === "string"
            ? item
            : item?.criterion ?? item?.description ?? JSON.stringify(item);
        defCount.set(key, (defCount.get(key) ?? 0) + 1);
      }
    } else if (d && typeof d === "object") {
      for (const [k, v] of Object.entries(d)) {
        if (v === false || (v as any)?.met === false) {
          defCount.set(k, (defCount.get(k) ?? 0) + 1);
        }
      }
    }
  }
  const topMissed = Array.from(defCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([criterion, count]) => ({ criterion, count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trends</h1>
        <p className="text-sm text-gray-400">
          Compliance and deficiency trends over time
        </p>
      </div>
      <TrendsCharts monthly={monthly} topMissed={topMissed} />
    </div>
  );
}
