import { db } from "@/lib/db";
import {
  companies,
  providers,
  reviewResults,
  reviewCases,
  correctiveActions,
  aiAnalyses,
} from "@/lib/db/schema";
import { and, eq, sql, desc, inArray } from "drizzle-orm";

export async function getDemoCompany() {
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.name, "Hunter Health"))
    .limit(1);
  if (rows.length > 0) return rows[0];
  const any = await db.select().from(companies).limit(1);
  return any[0];
}

export async function getComplianceScore(companyId: string) {
  const rows = await db
    .select({ score: reviewResults.overallScore })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.companyId, companyId));
  const scores = rows.map((r) => r.score ?? 0).filter((s) => s > 0);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export async function getReviewCasesForCompany(companyId: string) {
  return db
    .select()
    .from(reviewCases)
    .where(eq(reviewCases.companyId, companyId))
    .orderBy(desc(reviewCases.createdAt));
}

export async function getReviewsThisQuarter(companyId: string) {
  const rows = await db
    .select({ id: reviewResults.id, submittedAt: reviewResults.submittedAt })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.companyId, companyId));
  return rows.length;
}

export async function getAvgTurnaroundDays(companyId: string) {
  const rows = await db
    .select({
      assignedAt: reviewCases.assignedAt,
      completedAt: reviewResults.submittedAt,
    })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.companyId, companyId));

  const durations = rows
    .filter((r) => r.assignedAt && r.completedAt)
    .map(
      (r) =>
        (new Date(r.completedAt as any).getTime() -
          new Date(r.assignedAt as any).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  if (durations.length === 0) return 0;
  return Math.round(
    (durations.reduce((a, b) => a + b, 0) / durations.length) * 10
  ) / 10;
}

export async function getDocumentationRiskRate(companyId: string) {
  const all = await db
    .select({ id: reviewResults.id, deficiencies: reviewResults.deficiencies })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.companyId, companyId));

  if (all.length === 0) return 0;
  const withFlags = all.filter((r) => {
    const d = r.deficiencies as any;
    return Array.isArray(d) ? d.length > 0 : d != null && Object.keys(d || {}).length > 0;
  });
  return Math.round((withFlags.length / all.length) * 100);
}

export async function getRepeatDeficiencyCount(companyId: string) {
  const rows = await db
    .select({
      providerId: reviewCases.providerId,
      score: reviewResults.overallScore,
    })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.companyId, companyId));

  const lowByProvider = new Map<string, number>();
  for (const r of rows) {
    if (r.providerId && (r.score ?? 100) < 75) {
      lowByProvider.set(r.providerId, (lowByProvider.get(r.providerId) ?? 0) + 1);
    }
  }
  let count = 0;
  lowByProvider.forEach((v) => {
    if (v > 1) count++;
  });
  return count;
}

export async function getSpecialtyCompliance(companyId: string) {
  const rows = await db
    .select({
      specialty: providers.specialty,
      score: reviewResults.overallScore,
    })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .innerJoin(providers, eq(providers.id, reviewCases.providerId))
    .where(eq(reviewCases.companyId, companyId));

  const bySpec = new Map<string, number[]>();
  for (const r of rows) {
    const sp = r.specialty ?? "Other";
    if (!bySpec.has(sp)) bySpec.set(sp, []);
    bySpec.get(sp)!.push(r.score ?? 0);
  }
  const out: Array<{ specialty: string; avg: number; count: number }> = [];
  bySpec.forEach((scores, specialty) => {
    const s = scores.filter((x) => x > 0);
    if (s.length === 0) return;
    out.push({
      specialty,
      avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
      count: s.length,
    });
  });
  return out.sort((a, b) => b.avg - a.avg);
}

export async function getRiskDistribution(companyId: string) {
  const rows = await db
    .select({ score: reviewResults.overallScore })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.companyId, companyId));

  let high = 0, medium = 0, low = 0;
  for (const r of rows) {
    const s = r.score ?? 0;
    if (s < 70) high++;
    else if (s < 85) medium++;
    else low++;
  }
  return { high, medium, low };
}

export async function getNeedsAttention(companyId: string) {
  const pastDue = await db
    .select()
    .from(reviewCases)
    .where(
      and(eq(reviewCases.companyId, companyId), eq(reviewCases.status, "past_due"))
    )
    .limit(10);

  const lowProviderRows = await db
    .select({
      providerId: reviewCases.providerId,
      firstName: providers.firstName,
      lastName: providers.lastName,
      score: reviewResults.overallScore,
    })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .innerJoin(providers, eq(providers.id, reviewCases.providerId))
    .where(eq(reviewCases.companyId, companyId));

  const bestByProv = new Map<string, { name: string; score: number }>();
  for (const r of lowProviderRows) {
    if (!r.providerId) continue;
    const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
    const existing = bestByProv.get(r.providerId);
    const s = r.score ?? 100;
    if (!existing || s < existing.score) {
      bestByProv.set(r.providerId, { name, score: s });
    }
  }
  const lowProviders = Array.from(bestByProv.entries())
    .filter(([, v]) => v.score < 75)
    .map(([id, v]) => ({ id, ...v }))
    .slice(0, 5);

  const openActions = await db
    .select()
    .from(correctiveActions)
    .where(
      and(
        eq(correctiveActions.companyId, companyId),
        eq(correctiveActions.status, "open")
      )
    )
    .limit(5);

  return { pastDue, lowProviders, openActions };
}

export async function getProviderPerformance(companyId: string) {
  const rows = await db
    .select({
      providerId: providers.id,
      firstName: providers.firstName,
      lastName: providers.lastName,
      specialty: providers.specialty,
      score: reviewResults.overallScore,
      submittedAt: reviewResults.submittedAt,
    })
    .from(providers)
    .leftJoin(reviewCases, eq(reviewCases.providerId, providers.id))
    .leftJoin(reviewResults, eq(reviewResults.caseId, reviewCases.id))
    .where(eq(providers.companyId, companyId));

  const byProv = new Map<
    string,
    {
      id: string;
      name: string;
      specialty: string;
      scores: { score: number; at: Date }[];
    }
  >();
  for (const r of rows) {
    if (!byProv.has(r.providerId)) {
      byProv.set(r.providerId, {
        id: r.providerId,
        name: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Unknown",
        specialty: r.specialty ?? "—",
        scores: [],
      });
    }
    if (r.score != null && r.submittedAt) {
      byProv.get(r.providerId)!.scores.push({
        score: r.score,
        at: new Date(r.submittedAt as any),
      });
    }
  }
  return Array.from(byProv.values()).map((p) => {
    const sorted = p.scores.sort((a, b) => a.at.getTime() - b.at.getTime());
    const last4 = sorted.slice(-4).map((x) => x.score);
    const avg =
      sorted.length > 0
        ? Math.round(sorted.reduce((a, b) => a + b.score, 0) / sorted.length)
        : 0;
    return { id: p.id, name: p.name, specialty: p.specialty, last4, avg, count: sorted.length };
  });
}
