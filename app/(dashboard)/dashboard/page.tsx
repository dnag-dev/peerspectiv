import Link from "next/link";
import {
  FileQuestion,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Upload,
  Zap,
  Terminal,
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { companies, batches } from "@/lib/db/schema";
import { and, eq, gte, isNotNull, lt, lte, sql } from "drizzle-orm";
import { ClientOverviewCard } from "@/components/dashboard/ClientOverviewCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/KPICard";
import { CaseStatusChart } from "@/components/dashboard/CaseStatusChart";

export const dynamic = 'force-dynamic';

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Pulse chart palette — semantic tokens, not stock Tailwind hex
const STATUS_COLORS: Record<string, string> = {
  unassigned:       "#64748B", // ink-500
  pending_approval: "#F59E0B", // amber-500
  assigned:         "#3B82F6", // cobalt-500
  in_progress:      "#2563EB", // cobalt-600
  completed:        "#00B582", // mint-600
  past_due:         "#EF4444", // critical-500
};

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const todayIso = now.toISOString().split("T")[0];
  const in30Iso = new Date(now.getTime() + 30 * 86_400_000)
    .toISOString()
    .split("T")[0];
  const sevenDaysAgoDate = new Date(now.getTime() - 7 * 86_400_000);

  // Pipeline counts + stalled contract check + upcoming cycles (Drizzle)
  const [
    prospectsRow,
    contractsOutRow,
    signedRow,
    activeRow,
    oldestContractRow,
    upcomingCycles,
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(companies)
      .where(eq(companies.status, "prospect")),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(companies)
      .where(eq(companies.status, "contract_sent")),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(companies)
      .where(eq(companies.status, "contract_signed")),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(companies)
      .where(eq(companies.status, "active")),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(companies)
      .where(
        and(
          eq(companies.status, "contract_sent"),
          isNotNull(companies.contractSentAt),
          lt(companies.contractSentAt, sevenDaysAgoDate)
        )
      ),
    db
      .select({
        id: companies.id,
        name: companies.name,
        nextCycleDue: companies.nextCycleDue,
      })
      .from(companies)
      .where(
        and(
          eq(companies.status, "active"),
          isNotNull(companies.nextCycleDue),
          gte(companies.nextCycleDue, todayIso),
          lte(companies.nextCycleDue, in30Iso)
        )
      )
      .orderBy(companies.nextCycleDue),
  ]);

  const pipelineCounts = {
    prospects: Number(prospectsRow[0]?.c ?? 0),
    contractsOut: Number(contractsOutRow[0]?.c ?? 0),
    signed: Number(signedRow[0]?.c ?? 0),
    active: Number(activeRow[0]?.c ?? 0),
  };
  const hasStaleContracts = Number(oldestContractRow[0]?.c ?? 0) > 0;

  // Client Review Progress — batch progress per active company
  const batchProgress = await db.select({
    companyId: batches.companyId,
    companyName: companies.name,
    state: companies.state,
    batchName: batches.batchName,
    totalCases: batches.totalCases,
    completedCases: batches.completedCases,
    projectedCompletion: batches.projectedCompletion,
    batchStatus: batches.status,
  }).from(batches)
    .innerJoin(companies, eq(companies.id, batches.companyId))
    .where(eq(companies.status, 'active'))
    .orderBy(companies.name);

  // Fetch all KPI data in parallel
  const [
    unassignedRes,
    pendingApprovalRes,
    inProgressRes,
    pastDueRes,
    completedThisMonthRes,
    aiProcessingRes,
    casesByCompanyRes,
    allCasesStatusRes,
    auditLogsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("review_cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "unassigned"),
    supabaseAdmin
      .from("review_cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabaseAdmin
      .from("review_cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress"),
    supabaseAdmin
      .from("review_cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "past_due"),
    supabaseAdmin
      .from("review_cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("updated_at", startOfMonth),
    supabaseAdmin
      .from("review_cases")
      .select("*", { count: "exact", head: true })
      .eq("ai_analysis_status", "processing"),
    // Cases by company (last 30 days)
    supabaseAdmin
      .from("review_cases")
      .select("company_id, company:companies(name)")
      .gte("created_at", thirtyDaysAgo),
    // All cases for status distribution
    supabaseAdmin
      .from("review_cases")
      .select("status"),
    // Last 10 audit logs
    supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const unassigned = unassignedRes.count ?? 0;
  const pendingApproval = pendingApprovalRes.count ?? 0;
  const inProgress = inProgressRes.count ?? 0;
  const pastDue = pastDueRes.count ?? 0;
  const completedThisMonth = completedThisMonthRes.count ?? 0;
  const aiProcessing = aiProcessingRes.count ?? 0;

  // Aggregate cases by company
  const companyMap = new Map<string, number>();
  if (casesByCompanyRes.data) {
    for (const row of casesByCompanyRes.data) {
      const companyName =
        (row.companies as unknown as { name: string })?.name ?? "Unknown";
      companyMap.set(companyName, (companyMap.get(companyName) ?? 0) + 1);
    }
  }
  const casesByCompany = Array.from(companyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Aggregate cases by status
  const statusMap = new Map<string, number>();
  if (allCasesStatusRes.data) {
    for (const row of allCasesStatusRes.data) {
      statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1);
    }
  }
  const casesByStatus = Array.from(statusMap.entries()).map(
    ([status, count]) => ({
      status: formatAction(status),
      count,
      color: STATUS_COLORS[status] ?? "#6b7280",
    })
  );

  const auditLogs = auditLogsRes.data ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Dashboard
        </h1>
        <p className="text-sm text-ink-500">
          Overview of case activity and system health
        </p>
      </div>

      {/* Pipeline Summary — mini cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Link
          href="/prospects"
          className="block rounded-lg border-l-4 border-cobalt-600 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Prospects
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {pipelineCounts.prospects}
          </p>
        </Link>
        <Link
          href="/prospects"
          className={`block rounded-lg border-l-4 ${
            hasStaleContracts ? "border-critical-600" : "border-amber-600"
          } bg-white p-4 shadow-sm transition-shadow hover:shadow-md`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Contracts Out
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {pipelineCounts.contractsOut}
          </p>
          {hasStaleContracts && (
            <p className="mt-1 text-[11px] font-medium text-critical-600">
              Some &gt; 7 days old
            </p>
          )}
        </Link>
        <Link
          href="/prospects"
          className="block rounded-lg border-l-4 border-cobalt-500 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Pending Activation
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {pipelineCounts.signed}
          </p>
        </Link>
        <Link
          href="/companies?status=active"
          className="block rounded-lg border-l-4 border-mint-600 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Active Clients
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {pipelineCounts.active}
          </p>
        </Link>
      </div>

      {/* Upcoming Cycles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Upcoming Cycles (next 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingCycles.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-500">
              No cycles due in the next 30 days
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcomingCycles.map((c) => {
                const dueDate = c.nextCycleDue
                  ? new Date(c.nextCycleDue as unknown as string)
                  : null;
                const daysRemaining = dueDate
                  ? Math.max(
                      0,
                      Math.ceil(
                        (dueDate.getTime() - now.getTime()) / 86_400_000
                      )
                    )
                  : 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/companies/${c.id}`}
                      className="flex items-center justify-between px-2 py-2.5 transition-colors hover:bg-cobalt-50"
                    >
                      <span className="text-sm font-medium text-ink-900">
                        {c.name}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-ink-500">
                        <span>{c.nextCycleDue}</span>
                        <Badge
                          variant="outline"
                          className={
                            daysRemaining <= 7
                              ? "border-critical-600 text-critical-700"
                              : daysRemaining <= 14
                                ? "border-amber-600 text-amber-700"
                                : ""
                          }
                        >
                          {daysRemaining}d
                        </Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Client Review Progress */}
      {batchProgress.length > 0 && (
        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-ink-900">Client Review Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {batchProgress.map((bp) => (
              <ClientOverviewCard key={`${bp.companyId}-${bp.batchName}`} {...bp} />
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Unassigned Cases"
          value={unassigned}
          icon={<FileQuestion className="h-5 w-5 text-ink-500" />}
          color="bg-ink-500"
        />
        <KPICard
          title="Pending Approval"
          value={pendingApproval}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          color="bg-amber-600"
          pulse={pendingApproval > 0}
        />
        <KPICard
          title="In Progress"
          value={inProgress}
          icon={<Activity className="h-5 w-5 text-mint-600" />}
          color="bg-mint-600"
        />
        <KPICard
          title="Past Due"
          value={pastDue}
          icon={<AlertTriangle className="h-5 w-5 text-critical-600" />}
          color="bg-critical-600"
        />
        <KPICard
          title="Completed This Month"
          value={completedThisMonth}
          icon={<CheckCircle2 className="h-5 w-5 text-cobalt-500" />}
          color="bg-cobalt-500"
        />
        <KPICard
          title="AI Analyses Running"
          value={aiProcessing}
          icon={<Brain className="h-5 w-5 text-cobalt-600" />}
          color="bg-cobalt-600"
        />
      </div>

      {/* Charts */}
      <CaseStatusChart
        casesByCompany={casesByCompany}
        casesByStatus={casesByStatus}
      />

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              No recent activity
            </p>
          ) : (
            <ul className="space-y-3">
              {auditLogs.map((log: any) => (
                <li
                  key={log.id}
                  className="flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-cobalt-50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt-500/10">
                    <Activity className="h-4 w-4 text-cobalt-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900">
                      {formatAction(log.action)}
                      {log.resource_type && (
                        <span className="ml-1 font-normal text-ink-500">
                          on {log.resource_type}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>
                  {log.resource_id && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {log.resource_id.slice(0, 8)}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/batches">
            <Upload className="h-4 w-4" />
            Upload New Batch
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/assign">
            <Zap className="h-4 w-4" />
            Run AI Assignments
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/command">
            <Terminal className="h-4 w-4" />
            Open Command Center
          </Link>
        </Button>
      </div>
    </div>
  );
}
