import { db } from "@/lib/db";
import { reviewCases, providers } from "@/lib/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";

export const dynamic = "force-dynamic";

export default async function InProgressPage() {
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
      and(
        eq(reviewCases.companyId, company.id),
        inArray(reviewCases.status, ["assigned", "in_progress"])
      )
    )
    .orderBy(desc(reviewCases.assignedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">In Progress</h1>
        <p className="text-sm text-ink-400">
          Cases currently being reviewed ({rows.length})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.length === 0 && (
          <p className="text-ink-400">No cases in progress.</p>
        )}
        {rows.map((r) => {
          const providerName =
            `${r.providerFirst ?? ""} ${r.providerLast ?? ""}`.trim() || "—";
          const due = r.dueDate ? new Date(r.dueDate as any) : null;
          return (
            <div
              key={r.id}
              className="rounded-lg p-4 border-l-[3px]"
              style={{ backgroundColor: "#1E3A8A", borderLeftColor: "#F59E0B" }}
            >
              <div className="text-xs uppercase tracking-wider text-ink-500">
                {r.status}
              </div>
              <div className="mt-1 text-sm font-semibold text-white truncate">
                {r.chartFileName ?? "Case"}
              </div>
              <div className="text-xs text-ink-400 mt-1">{providerName}</div>
              <div className="text-xs text-ink-400">{r.specialty ?? "—"}</div>
              {due && (
                <div className="mt-3 text-xs text-ink-300">
                  Due: {due.toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
