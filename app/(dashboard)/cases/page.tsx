import Link from "next/link";
import { db } from "@/lib/db";
import { reviewCases, providers, peers, companies } from "@/lib/db/schema";
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  ai_status?: string;
  month?: string;
  risk?: string;
  cadence_period_label?: string;
  company?: string;
  peer?: string;
}

const STATUS_LABEL: Record<string, string> = {
  unassigned: "Unassigned",
  pending_approval: "Pending Approval",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  past_due: "Past Due",
};

function statusBadgeVariant(s: string | null): "secondary" | "warning" | "destructive" | "completed" {
  if (s === "completed") return "completed";
  if (s === "past_due") return "destructive";
  if (s === "pending_approval" || s === "in_progress") return "warning";
  return "secondary";
}

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysIn(status: string | null, updatedAt: Date | string | null): string {
  if (!updatedAt) return "—";
  const ms = Date.now() - new Date(updatedAt).getTime();
  return `${Math.max(0, Math.floor(ms / 86_400_000))}d`;
}

export default async function CasesIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();
  const filters: SQL[] = [];
  if (searchParams.status) {
    filters.push(eq(reviewCases.status, searchParams.status));
  }
  if (searchParams.ai_status) {
    filters.push(eq(reviewCases.aiAnalysisStatus, searchParams.ai_status));
  }
  if (searchParams.month === "current") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filters.push(gte(reviewCases.updatedAt, startOfMonth));
  }
  if (searchParams.cadence_period_label) {
    filters.push(eq(reviewCases.cadencePeriodLabel, searchParams.cadence_period_label));
  }
  if (searchParams.company) {
    filters.push(eq(reviewCases.companyId, searchParams.company));
  }
  if (searchParams.peer) {
    filters.push(eq(reviewCases.peerId, searchParams.peer));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: reviewCases.id,
      status: reviewCases.status,
      dueDate: reviewCases.dueDate,
      updatedAt: reviewCases.updatedAt,
      mrnNumber: reviewCases.mrnNumber,
      cadencePeriodLabel: reviewCases.cadencePeriodLabel,
      providerFirst: providers.firstName,
      providerLast: providers.lastName,
      providerSpecialty: providers.specialty,
      peerName: peers.fullName,
      companyName: companies.name,
    })
    .from(reviewCases)
    .leftJoin(providers, eq(providers.id, reviewCases.providerId))
    .leftJoin(peers, eq(peers.id, reviewCases.peerId))
    .leftJoin(companies, eq(companies.id, reviewCases.companyId))
    .where(where)
    .orderBy(desc(reviewCases.updatedAt))
    .limit(500);

  const totalRow = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(reviewCases)
    .where(where);
  const total = Number(totalRow[0]?.c ?? 0);

  const filterDescriptors: string[] = [];
  if (searchParams.status) filterDescriptors.push(`status = ${searchParams.status}`);
  if (searchParams.ai_status) filterDescriptors.push(`ai = ${searchParams.ai_status}`);
  if (searchParams.month === "current") filterDescriptors.push("month = current");
  if (searchParams.company) filterDescriptors.push(`company = ${searchParams.company.slice(0, 8)}…`);
  if (searchParams.peer) filterDescriptors.push(`peer = ${searchParams.peer.slice(0, 8)}…`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Reviews</h1>
        <p className="text-sm text-ink-secondary">
          {total} case{total === 1 ? "" : "s"}
          {filterDescriptors.length > 0 && (
            <> · filters: {filterDescriptors.join(", ")}</>
          )}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          title="No reviews match your filter"
          message="Try clearing one of the filters or jump back to the dashboard."
          backHref="/dashboard"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-ink-50 text-xs uppercase tracking-wider text-ink-secondary">
                <th className="px-4 py-3 text-left">Case ref</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Specialty</th>
                <th className="px-4 py-3 text-left">Peer</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Days in status</th>
                <th className="px-4 py-3 text-left">Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const provider =
                  `${r.providerFirst ?? ""} ${r.providerLast ?? ""}`.trim() || "—";
                return (
                  <tr key={r.id} className="border-b border-border-subtle hover:bg-status-info-bg">
                    <td className="px-4 py-3 font-mono text-xs text-ink-primary">
                      <Link
                        href={`/cases/${r.id}`}
                        className="hover:text-status-info-fg hover:underline"
                      >
                        {r.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-primary">{provider}</td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {r.providerSpecialty ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{r.peerName ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-secondary">{r.companyName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(r.status)}>
                        {STATUS_LABEL[r.status ?? ""] ?? r.status ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {daysIn(r.status, r.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{fmtDate(r.dueDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
