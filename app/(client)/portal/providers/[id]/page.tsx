import Link from "next/link";
import { db } from "@/lib/db";
import {
  providers,
  reviewResults,
  reviewCases,
  correctiveActions,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ProviderCharts } from "./ProviderCharts";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ProviderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const providerRows = await db
    .select()
    .from(providers)
    .where(eq(providers.id, params.id))
    .limit(1);

  if (providerRows.length === 0) {
    return (
      <div className="text-ink-primary">
        <h1 className="text-2xl font-medium">Provider not found</h1>
        <Link href="/portal" className="text-status-info-dot underline">
          Back to dashboard
        </Link>
      </div>
    );
  }
  const p = providerRows[0];
  const initials = `${(p.firstName ?? "?")[0] ?? ""}${(p.lastName ?? "?")[0] ?? ""}`.toUpperCase();
  const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unknown";

  const reviews = await db
    .select({
      id: reviewResults.id,
      caseId: reviewResults.caseId,
      overallScore: reviewResults.overallScore,
      submittedAt: reviewResults.submittedAt,
      deficiencies: reviewResults.deficiencies,
    })
    .from(reviewResults)
    .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
    .where(eq(reviewCases.providerId, params.id))
    .orderBy(desc(reviewResults.submittedAt))
    .limit(20);

  const last5 = reviews.slice(0, 5);
  const last6 = reviews.slice(0, 6).reverse().map((r, i) => ({
    label: r.submittedAt ? new Date(r.submittedAt as any).toLocaleDateString() : `#${i + 1}`,
    score: Number(r.overallScore ?? 0),
  }));

  // Common deficiencies
  const defCount = new Map<string, number>();
  for (const r of reviews) {
    const d = r.deficiencies as any;
    if (Array.isArray(d)) {
      for (const item of d) {
        const key = typeof item === "string" ? item : item?.criterion ?? item?.description ?? JSON.stringify(item);
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
  const topDeficiencies = Array.from(defCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const openActions = await db
    .select()
    .from(correctiveActions)
    .where(
      and(
        eq(correctiveActions.providerId, params.id),
        eq(correctiveActions.status, "open")
      )
    );

  const avg =
    reviews.length > 0
      ? Math.round(
          reviews.reduce((a, r) => a + Number(r.overallScore ?? 0), 0) / reviews.length
        )
      : 0;
  const badgeColor = avg >= 85 ? "#22C55E" : avg >= 70 ? "#F59E0B" : "#EF4444";

  return (
    <div className="space-y-6 text-ink-primary">
      <Link href="/portal" className="text-sm text-status-info-dot hover:underline">
        ← Back
      </Link>

      <div
        className="rounded-lg p-6 flex items-center gap-6"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-xl font-medium"
          style={{ backgroundColor: "#0F6E56" }}
        >
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-medium">{name}</h1>
          <p className="text-sm text-ink-tertiary">{p.specialty ?? "—"}</p>
          {p.npi && <p className="text-xs text-ink-secondary">NPI: {p.npi}</p>}
        </div>
        <div className="text-right">
          <div
            className="inline-block rounded-full px-4 py-2 text-lg font-medium"
            style={{ backgroundColor: `${badgeColor}22`, color: badgeColor }}
          >
            {avg}%
          </div>
          <p className="text-xs text-ink-tertiary mt-1">Avg Score</p>
        </div>
      </div>

      <ProviderCharts last6={last6} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)' }}>
          <h3 className="text-sm font-medium mb-3">Recent Reviews (last 5)</h3>
          {last5.length === 0 ? (
            <p className="text-sm text-ink-tertiary">No reviews.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink-secondary">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {last5.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "#2A3F5F" }}>
                    <td className="py-2 text-ink-tertiary">
                      {r.submittedAt
                        ? new Date(r.submittedAt as any).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2">{r.overallScore ?? "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)' }}>
          <h3 className="text-sm font-medium mb-3">Common Deficiencies</h3>
          {topDeficiencies.length === 0 ? (
            <p className="text-sm text-ink-tertiary">No deficiencies recorded.</p>
          ) : (
            <ul className="space-y-2">
              {topDeficiencies.map(([key, count]) => (
                <li
                  key={key}
                  className="flex justify-between rounded-md p-2 text-sm"
                  style={{ backgroundColor: 'var(--color-card)' }}
                >
                  <span className="text-ink-200 truncate pr-2">{key}</span>
                  <span className="text-xs text-status-warning-dot">x{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)' }}>
        <h3 className="text-sm font-medium mb-3">Open Corrective Actions</h3>
        {openActions.length === 0 ? (
          <p className="text-sm text-ink-tertiary">None.</p>
        ) : (
          <ul className="space-y-2">
            {openActions.map((a) => (
              <li
                key={a.id}
                className="rounded-md p-3"
                style={{ backgroundColor: 'var(--color-card)' }}
              >
                <div className="font-medium">{a.title}</div>
                {a.description && (
                  <div className="text-xs text-ink-tertiary mt-1">{a.description}</div>
                )}
                <div className="text-xs text-ink-secondary mt-1">
                  Progress: {a.progressPct ?? 0}%
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
