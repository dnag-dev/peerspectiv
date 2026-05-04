import { db } from "@/lib/db";
import { reviewCases, providers } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function OverduePage() {
  noStore();
  const company = await getDemoCompany();
  const rows = await db
    .select({
      id: reviewCases.id,
      status: reviewCases.status,
      chartFileName: reviewCases.chartFileName,
      assignedAt: reviewCases.assignedAt,
      dueDate: reviewCases.dueDate,
      specialty: reviewCases.specialtyRequired,
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
    })
    .from(reviewCases)
    .leftJoin(providers, eq(providers.id, reviewCases.providerId))
    .where(
      and(eq(reviewCases.companyId, company.id), eq(reviewCases.status, "past_due"))
    )
    .orderBy(desc(reviewCases.dueDate));

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overdue</h1>
        <p className="text-sm text-ink-400">Past-due cases requiring attention ({rows.length})</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.length === 0 && (
          <p className="text-ink-400">No overdue cases. Well done.</p>
        )}
        {rows.map((r) => {
          const providerName =
            `${r.providerFirst ?? ""} ${r.providerLast ?? ""}`.trim() || "—";
          const due = r.dueDate ? new Date(r.dueDate as any) : null;
          const daysLate = due
            ? Math.max(0, Math.round((now - due.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          return (
            <div
              key={r.id}
              className="rounded-lg p-4 border-l-[3px]"
              style={{ backgroundColor: "#1E3A8A", borderLeftColor: "#EF4444" }}
            >
              <div
                className="inline-block rounded px-2 py-0.5 text-xs font-bold"
                style={{ backgroundColor: "rgba(239,68,68,0.2)", color: "#EF4444" }}
              >
                {daysLate}d late
              </div>
              <div className="mt-2 text-sm font-semibold text-white truncate">
                {r.chartFileName ?? "Case"}
              </div>
              <div className="text-xs text-ink-400 mt-1">{providerName}</div>
              <div className="text-xs text-ink-400">{r.specialty ?? "—"}</div>
              {due && (
                <div className="mt-3 text-xs" style={{ color: "#EF4444" }}>
                  Was due {due.toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
