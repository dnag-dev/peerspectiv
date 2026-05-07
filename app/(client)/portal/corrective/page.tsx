import { db } from "@/lib/db";
import { correctiveActions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getDemoCompany } from "@/lib/portal/queries";
import { CorrectiveList } from "./CorrectiveList";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default async function CorrectivePage() {
  noStore();
  const company = await getDemoCompany();
  const rows = await db
    .select()
    .from(correctiveActions)
    .where(eq(correctiveActions.companyId, company.id))
    .orderBy(desc(correctiveActions.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-primary">Corrective Actions</h1>
        <p className="text-sm text-ink-tertiary">
          Track and manage corrective action items
        </p>
      </div>
      <CorrectiveList
        actions={rows.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description ?? "",
          status: a.status ?? "open",
          progress: a.progressPct ?? 0,
          dueDate: a.dueDate ? new Date(a.dueDate as any).toISOString() : null,
          assignedTo: a.assignedTo ?? null,
        }))}
      />
    </div>
  );
}
