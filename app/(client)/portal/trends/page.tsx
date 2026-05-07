import { db } from "@/lib/db";
import { reviewResults, reviewCases, providers } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { TrendsCharts } from "./TrendsCharts";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { specialty?: string | string[] };
}

function quarterKeyFromDate(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

export default async function TrendsPage({ searchParams }: PageProps) {
  noStore();
  const company = await getDemoCompany();

  // Specialty filter (multi-select via repeated query string)
  const raw = searchParams?.specialty;
  const selectedSpecialties = Array.isArray(raw)
    ? raw
    : raw
    ? [raw]
    : [];

  // Pull all available specialties for the filter dropdown.
  const allProviders = await db
    .select({ specialty: providers.specialty })
    .from(providers);
  const specialtyOptions = Array.from(
    new Set(
      allProviders
        .map((p) => (p.specialty ?? "").trim())
        .filter((s) => s.length > 0)
    )
  ).sort();

  const conditions = [eq(reviewCases.companyId, company.id)];
  if (selectedSpecialties.length > 0) {
    conditions.push(inArray(providers.specialty, selectedSpecialties));
  }

  const rows = await db
    .select({
      score: reviewResults.overallScore,
      submittedAt: reviewResults.submittedAt,
      deficiencies: reviewResults.deficiencies,
      criteriaScores: reviewResults.criteriaScores,
      providerSpecialty: providers.specialty,
    })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .innerJoin(providers, eq(providers.id, reviewCases.providerId))
    .where(and(...conditions));

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
    if (m) m.scores.push(Number(r.score));
  }
  const monthly = months.map((m) => ({
    key: m.key,
    label: m.label,
    avg:
      m.scores.length > 0
        ? Math.round(m.scores.reduce((a, b) => a + b, 0) / m.scores.length)
        : 0,
    count: m.scores.length,
  }));

  // Build per-criterion yes/no tallies (from criteria_scores JSONB) and quarterly trend.
  type Bucket = { yes: number; no: number; na: number; perQuarter: Map<string, { yes: number; no: number; na: number }> };
  const byCriterion = new Map<string, Bucket>();

  function tallyResponse(
    criterion: string,
    response: "yes" | "no" | "na",
    quarterKey: string
  ) {
    let b = byCriterion.get(criterion);
    if (!b) {
      b = { yes: 0, no: 0, na: 0, perQuarter: new Map() };
      byCriterion.set(criterion, b);
    }
    b[response] += 1;
    let q = b.perQuarter.get(quarterKey);
    if (!q) {
      q = { yes: 0, no: 0, na: 0 };
      b.perQuarter.set(quarterKey, q);
    }
    q[response] += 1;
  }

  for (const r of rows) {
    const cs = r.criteriaScores as any;
    if (!cs) continue;
    const submitted = r.submittedAt ? new Date(r.submittedAt as any) : null;
    if (!submitted) continue;
    const qKey = quarterKeyFromDate(submitted);

    if (Array.isArray(cs)) {
      for (const item of cs) {
        const criterion =
          item?.criterion ?? item?.label ?? item?.name ?? null;
        if (!criterion) continue;
        // score 0..4 — treat 0 as "no", 4 as "yes", neutral as "na"
        const score = item?.score;
        const lbl = (item?.score_label ?? "").toString().toLowerCase();
        let response: "yes" | "no" | "na";
        if (lbl === "yes" || lbl === "met" || score === 4 || score === 3) {
          response = "yes";
        } else if (lbl === "no" || lbl === "not_met" || score === 0 || score === 1) {
          response = "no";
        } else {
          response = "na";
        }
        tallyResponse(String(criterion), response, qKey);
      }
    } else if (typeof cs === "object") {
      for (const [criterion, value] of Object.entries(cs)) {
        let response: "yes" | "no" | "na" = "na";
        if (value === true || (value as any)?.met === true) response = "yes";
        else if (value === false || (value as any)?.met === false) response = "no";
        tallyResponse(criterion, response, qKey);
      }
    }
  }

  const topMissed = Array.from(byCriterion.entries())
    .map(([criterion, b]) => {
      const total = b.yes + b.no + b.na;
      const noPct = total > 0 ? Math.round((b.no / total) * 100) : 0;
      const quarters = Array.from(b.perQuarter.entries())
        .map(([qLabel, q]) => {
          const t = q.yes + q.no + q.na;
          return {
            quarter: qLabel,
            noPct: t > 0 ? Math.round((q.no / t) * 100) : 0,
          };
        })
        // sort chronologically by year then Q
        .sort((a, b) => {
          const parse = (s: string) => {
            const m = /^Q(\d) (\d{4})$/.exec(s);
            return m ? Number(m[2]) * 10 + Number(m[1]) : 0;
          };
          return parse(a.quarter) - parse(b.quarter);
        });
      return { criterion, count: b.no, noPct, quarters };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => {
      if (b.noPct !== a.noPct) return b.noPct - a.noPct;
      return b.count - a.count;
    })
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Trends</h1>
        <p className="text-sm text-ink-tertiary">
          Compliance and deficiency trends over time
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg p-3"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        <div className="flex flex-col">
          <label className="text-xs text-ink-tertiary mb-1">
            Filter by specialty (Cmd/Ctrl-click for multi)
          </label>
          <select
            name="specialty"
            multiple
            defaultValue={selectedSpecialties}
            className="rounded-md px-3 py-2 text-sm text-ink-primary min-w-[220px]"
            size={Math.min(6, Math.max(3, specialtyOptions.length))}
          >
            {specialtyOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium text-ink-primary"
          style={{ backgroundColor: "#0F6E56" }}
        >
          Apply
        </button>
        {selectedSpecialties.length > 0 && (
          <a
            href="/portal/trends"
            className="rounded-md px-4 py-2 text-sm text-ink-tertiary hover:text-ink-primary"
          >
            Clear
          </a>
        )}
      </form>

      <TrendsCharts monthly={monthly} topMissed={topMissed} />
    </div>
  );
}
