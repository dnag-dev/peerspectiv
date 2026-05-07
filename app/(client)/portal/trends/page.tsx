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
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Hunter Health · client portal</p>
        <h1 className="mt-0.5 text-xl font-medium tracking-tight text-ink-primary">Trends</h1>
        <p className="mt-0.5 text-sm text-ink-secondary">
          Compliance and deficiency trends over time
        </p>
      </div>

      <form
        method="get"
        className="rounded-md border border-border-subtle bg-surface-card p-4"
      >
        <p className="eyebrow mb-2">Filter by specialty</p>
        <div className="flex flex-wrap items-center gap-2">
          {specialtyOptions.map((s) => {
            const on = selectedSpecialties.includes(s);
            return (
              <label
                key={s}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  on
                    ? "border-brand bg-brand/10 text-status-success-fg"
                    : "border-border-subtle bg-surface-card text-ink-primary hover:bg-surface-muted"
                }`}
              >
                <input
                  type="checkbox"
                  name="specialty"
                  value={s}
                  defaultChecked={on}
                  className="sr-only"
                />
                {on && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {s}
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            Apply
          </button>
          {selectedSpecialties.length > 0 && (
            <a
              href="/portal/trends"
              className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-card px-3 py-1.5 text-sm font-medium text-ink-primary transition hover:bg-surface-muted"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      <TrendsCharts monthly={monthly} topMissed={topMissed} />
    </div>
  );
}
