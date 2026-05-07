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
import { db } from "@/lib/db";
import { companies, batches, reviewCases, auditLogs } from "@/lib/db/schema";
import { and, desc, eq, gte, isNotNull, lt, lte, notInArray, sql } from "drizzle-orm";
import { buildCadencePeriods, type CadenceConfig } from "@/lib/cadence/core";
import { ClientOverviewCard } from "@/components/dashboard/ClientOverviewCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/ui/StatusPill";
import AskAshButton from "@/components/ui/AskAshButton";
import { KPICard } from "@/components/dashboard/KPICard";
import { CaseStatusChart } from "@/components/dashboard/CaseStatusChart";
import { CompanyFilter } from "@/components/dashboard/CompanyFilter";
import { unstable_noStore as noStore } from "next/cache";

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
  assigned:         "#0F6E56", // brand (was cobalt-500)
  in_progress:      "#085041", // brand-hover (was cobalt-600)
  completed:        "#00B582", // mint-600
  past_due:         "#EF4444", // critical-500
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { company?: string };
}) {
  noStore();
  const now = new Date();
  // SA-003: optional company filter applied to every per-case query below.
  const filterCompanyId = searchParams?.company || null;
  const companyFilterSql = filterCompanyId
    ? eq(reviewCases.companyId, filterCompanyId)
    : undefined;
  const companyParam = filterCompanyId ? `&company=${filterCompanyId}` : "";

  const companyOptions = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(notInArray(companies.status, ['lead', 'archived']))
    .orderBy(companies.name);
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
        cadencePeriodType: companies.cadencePeriodType,
        fiscalYearStartMonth: companies.fiscalYearStartMonth,
        cadencePeriodMonths: companies.cadencePeriodMonths,
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

  // Client Review Progress — aggregate batches PER COMPANY so each card
  // represents one company (not one batch). Without this the grid blows
  // up with 3-4 empty rows per company, all "0 of 0 cases · On track".
  const batchRowsRaw = await db.select({
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

  const aggMap = new Map<string, {
    companyId: string | null;
    companyName: string | null;
    state: string | null;
    totalCases: number;
    completedCases: number;
    projectedCompletion: Date | null;
    batchStatus: string | null;
    batchName: string | null;
  }>();
  for (const r of batchRowsRaw) {
    if (!r.companyId) continue;
    const existing = aggMap.get(r.companyId);
    const total = Number(r.totalCases ?? 0);
    const completed = Number(r.completedCases ?? 0);
    const projected = r.projectedCompletion ? new Date(r.projectedCompletion as any) : null;
    if (!existing) {
      aggMap.set(r.companyId, {
        companyId: r.companyId,
        companyName: r.companyName,
        state: r.state,
        totalCases: total,
        completedCases: completed,
        projectedCompletion: projected,
        batchStatus: r.batchStatus,
        batchName: r.batchName,
      });
    } else {
      existing.totalCases += total;
      existing.completedCases += completed;
      // Keep the LATEST projected completion across batches.
      if (projected && (!existing.projectedCompletion || projected > existing.projectedCompletion)) {
        existing.projectedCompletion = projected;
      }
    }
  }
  // Show only companies with at least one case in flight; drop empty rows.
  const batchProgress = Array.from(aggMap.values())
    .filter((r) => r.totalCases > 0)
    .sort((a, b) => (a.companyName ?? '').localeCompare(b.companyName ?? ''));

  // Fetch all KPI data in parallel
  const withCompanyFilter = (where: any) =>
    companyFilterSql ? and(where, companyFilterSql) : where;
  const countQuery = (where: any) =>
    db.select({ c: sql<number>`count(*)::int` }).from(reviewCases).where(where);

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
    countQuery(withCompanyFilter(eq(reviewCases.status, "unassigned"))),
    countQuery(withCompanyFilter(eq(reviewCases.status, "pending_approval"))),
    countQuery(withCompanyFilter(eq(reviewCases.status, "in_progress"))),
    countQuery(withCompanyFilter(eq(reviewCases.status, "past_due"))),
    countQuery(
      withCompanyFilter(
        and(eq(reviewCases.status, "completed"), gte(reviewCases.updatedAt, new Date(startOfMonth)))
      )
    ),
    countQuery(withCompanyFilter(eq(reviewCases.aiAnalysisStatus, "processing"))),
    db.query.reviewCases.findMany({
      where: withCompanyFilter(gte(reviewCases.createdAt, new Date(thirtyDaysAgo))),
      columns: { companyId: true },
      with: { company: { columns: { name: true } } },
    }),
    db
      .select({ status: reviewCases.status })
      .from(reviewCases)
      .where(companyFilterSql),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10),
  ]);

  const unassigned = Number(unassignedRes[0]?.c ?? 0);
  const pendingApproval = Number(pendingApprovalRes[0]?.c ?? 0);
  const inProgress = Number(inProgressRes[0]?.c ?? 0);
  const pastDue = Number(pastDueRes[0]?.c ?? 0);
  const completedThisMonth = Number(completedThisMonthRes[0]?.c ?? 0);
  const aiProcessing = Number(aiProcessingRes[0]?.c ?? 0);

  // Aggregate cases by company
  const companyMap = new Map<string, number>();
  for (const row of casesByCompanyRes) {
    const companyName = row.company?.name ?? "Unknown";
    companyMap.set(companyName, (companyMap.get(companyName) ?? 0) + 1);
  }
  const casesByCompany = Array.from(companyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Aggregate cases by status
  const statusMap = new Map<string, number>();
  for (const row of allCasesStatusRes) {
    const s = (row.status as string) ?? '';
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const casesByStatus = Array.from(statusMap.entries()).map(
    ([status, count]) => ({
      status: formatAction(status),
      count,
      color: STATUS_COLORS[status] ?? "#6b7280",
    })
  );

  const auditLogList = auditLogsRes;

  // Build cadence label per upcoming cycle once for clean rendering below.
  const cyclesWithMeta = upcomingCycles.map((c) => {
    const dueDate = c.nextCycleDue ? new Date(c.nextCycleDue as unknown as string) : null;
    const daysRemaining = dueDate
      ? Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000))
      : 0;
    const cfg: CadenceConfig = {
      fiscalYearStartMonth: c.fiscalYearStartMonth ?? 1,
      type: (c.cadencePeriodType ?? "quarterly") as CadenceConfig["type"],
      customMonths: c.cadencePeriodMonths ?? undefined,
    };
    const periods = buildCadencePeriods(cfg, dueDate ?? now, 0);
    const label = periods.length > 0 ? periods[periods.length - 1].label : null;
    return { ...c, dueDate, daysRemaining, label };
  });

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Workspace · admin</p>
          <h1 className="mt-0.5 text-xl font-medium tracking-tight text-ink-primary">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <CompanyFilter companies={companyOptions} current={filterCompanyId ?? ""} />
          <AskAshButton />
        </div>
      </div>

      {/* Pipeline KPI row — 4 across, brand-led dots + eyebrow + display number */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Link href="/prospects" className="block rounded-md border border-border-subtle bg-surface-card p-3 transition hover:shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning-dot" />
            <span className="eyebrow">Prospects</span>
          </div>
          <p className="display-number mb-0.5">{pipelineCounts.prospects}</p>
          <p className="text-2xs text-ink-tertiary">+1 this week</p>
        </Link>
        <Link href="/prospects" className="block rounded-md border border-border-subtle bg-surface-card p-3 transition hover:shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${hasStaleContracts ? "bg-status-danger-dot" : "bg-status-info-dot"}`} />
            <span className="eyebrow">Contracts out</span>
          </div>
          <p className="display-number mb-0.5">{pipelineCounts.contractsOut}</p>
          <p className="text-2xs text-ink-tertiary">
            {hasStaleContracts ? "Some > 7 days old" : `${pipelineCounts.contractsOut} awaiting signature`}
          </p>
        </Link>
        <Link href="/prospects" className="block rounded-md border border-border-subtle bg-surface-card p-3 transition hover:shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-status-neutral-dot" />
            <span className="eyebrow">Pending activation</span>
          </div>
          <p className="display-number mb-0.5">{pipelineCounts.signed}</p>
          <p className="text-2xs text-ink-tertiary">Avg 4 days to launch</p>
        </Link>
        <Link href="/companies?status=active" className="block rounded-md border border-border-subtle bg-surface-card p-3 transition hover:shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-status-success-dot" />
            <span className="eyebrow">Active clients</span>
          </div>
          <p className="display-number mb-0.5">{pipelineCounts.active}</p>
          <p className="text-2xs text-ink-tertiary">+2 this quarter</p>
        </Link>
      </div>

      {/* Upcoming cycles · next 30 days */}
      <div className="rounded-md border border-border-subtle bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <p className="text-sm font-medium text-ink-primary">Upcoming cycles · next 30 days</p>
          <p className="text-2xs text-ink-tertiary">{cyclesWithMeta.length} cycles</p>
        </div>
        {cyclesWithMeta.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-tertiary">No cycles due in the next 30 days</p>
        ) : (
          <ul>
            {cyclesWithMeta.map((c) => {
              const dueText = c.dueDate ? c.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
              const daysToneClass =
                c.daysRemaining <= 7
                  ? "text-status-danger-fg"
                  : c.daysRemaining <= 30
                    ? "text-status-warning-fg"
                    : "text-ink-tertiary";
              return (
                <li key={c.id} className="border-t border-border-subtle first:border-t-0">
                  <Link href={`/companies/${c.id}`} className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-muted/40">
                    <span className="text-sm font-medium text-ink-primary">{c.name}</span>
                    <div className="flex items-center gap-4 text-xs">
                      {c.label && <StatusPill variant="success">{c.label}</StatusPill>}
                      <span className="text-ink-secondary">{dueText}</span>
                      <span className={`text-2xs font-medium ${daysToneClass}`}>{c.daysRemaining}d</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Client review progress */}
      {batchProgress.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-primary">Client review progress</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {batchProgress.map((bp) => (
              <ClientOverviewCard key={bp.companyId ?? bp.companyName ?? Math.random()} {...bp} />
            ))}
          </div>
        </div>
      )}

      {/* Operational KPI grid — every numeric drills (AU-016). Secondary section. */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-primary">Case activity</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`/cases?status=unassigned${companyParam}`} data-testid="kpi-link" className="block">
            <KPICard title="Unassigned cases" value={unassigned} icon={<FileQuestion className="h-5 w-5 text-ink-tertiary" />} color="bg-ink-500" />
          </Link>
          <Link href={`/cases?status=pending_approval${companyParam}`} data-testid="kpi-link" className="block">
            <KPICard title="Pending approval" value={pendingApproval} icon={<Clock className="h-5 w-5 text-status-warning-dot" />} color="bg-status-warning-dot" pulse={pendingApproval > 0} />
          </Link>
          <Link href={`/cases?status=in_progress${companyParam}`} data-testid="kpi-link" className="block">
            <KPICard title="In progress" value={inProgress} icon={<Activity className="h-5 w-5 text-status-success-dot" />} color="bg-status-success-dot" />
          </Link>
          <Link href={`/cases?status=past_due${companyParam}`} data-testid="kpi-link" className="block">
            <KPICard title="Past due" value={pastDue} icon={<AlertTriangle className="h-5 w-5 text-status-danger-dot" />} color="bg-status-danger-dot" />
          </Link>
          <Link href={`/cases?status=completed&month=current${companyParam}`} data-testid="kpi-link" className="block">
            <KPICard title="Completed this month" value={completedThisMonth} icon={<CheckCircle2 className="h-5 w-5 text-status-info-dot" />} color="bg-brand" />
          </Link>
          <Link href={`/cases?ai_status=processing${companyParam}`} data-testid="kpi-link" className="block">
            <KPICard title="AI analyses running" value={aiProcessing} icon={<Brain className="h-5 w-5 text-status-info-dot" />} color="bg-brand" />
          </Link>
        </div>
      </div>

      {/* Charts */}
      <CaseStatusChart casesByCompany={casesByCompany} casesByStatus={casesByStatus} />

      {/* Recent activity */}
      <div className="rounded-md border border-border-subtle bg-surface-card">
        <div className="border-b border-border-subtle px-4 py-3">
          <p className="text-sm font-medium text-ink-primary">Recent activity</p>
        </div>
        {auditLogList.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-tertiary">No recent activity</p>
        ) : (
          <ul>
            {auditLogList.map((log) => (
              <li key={log.id} className="flex items-start gap-3 border-t border-border-subtle px-4 py-2.5 first:border-t-0">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-status-info-bg">
                  <Activity className="h-3.5 w-3.5 text-status-info-fg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-primary">
                    {formatAction(log.action)}
                    {log.resourceType && <span className="ml-1 text-ink-tertiary">on {log.resourceType}</span>}
                  </p>
                  <p className="text-2xs text-ink-tertiary">
                    {log.createdAt ? formatRelativeTime(new Date(log.createdAt).toISOString()) : ""}
                  </p>
                </div>
                {log.resourceId && <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-2xs text-ink-secondary">{log.resourceId.slice(0, 8)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/batches" className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-hover">
          <Upload className="h-4 w-4" />
          Upload new batch
        </Link>
        <Link href="/assign" className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-muted">
          <Zap className="h-4 w-4" />
          Run AI assignments
        </Link>
        <Link href="/command" className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-muted">
          <Terminal className="h-4 w-4" />
          Open command center
        </Link>
      </div>
    </div>
  );
}
