import { db } from "@/lib/db";
import { reviewCases, providers } from "@/lib/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function InProgressPage() {
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
      and(
        eq(reviewCases.companyId, company.id),
        inArray(reviewCases.status, ["assigned", "in_progress"])
      )
    )
    .orderBy(desc(reviewCases.assignedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">In progress</h1>
        <p className="text-sm text-ink-secondary">
          Cases currently being reviewed ({rows.length})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.length === 0 && (
          <p className="text-ink-tertiary">No cases in progress.</p>
        )}
        {rows.map((r) => {
          const providerName =
            `${r.providerFirst ?? ""} ${r.providerLast ?? ""}`.trim() || "—";
          const due = r.dueDate ? new Date(r.dueDate as any) : null;
          return (
            <div
              key={r.id}
              className="rounded-lg p-4 border-l-[3px]"
              style={{ backgroundColor: 'var(--color-card)', borderLeftColor: "#F59E0B" }}
            >
              <div className="text-xs uppercase tracking-wider text-ink-secondary">
                {r.status}
              </div>
              <div className="mt-1 text-sm font-medium text-ink-primary truncate">
                {r.chartFileName ?? "Case"}
              </div>
              <div className="text-xs text-ink-tertiary mt-1">{providerName}</div>
              <div className="text-xs text-ink-tertiary">{r.specialty ?? "—"}</div>
              {due && (
                <div className="mt-3 text-xs text-ink-tertiary">
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
