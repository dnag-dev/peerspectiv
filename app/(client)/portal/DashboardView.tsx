"use client";

import Link from "next/link";
import { useClientRole } from "@/components/layout/ClientPortalShell";
import type { ClientRole } from "@/components/layout/ClientSidebar";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as ReTooltip,
} from "recharts";
import { AlertTriangle, TrendingDown, Wrench, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  companyName: string;
  projectedCompletion: string | null;
  compliance: number;
  reviewsThisQuarter: number;
  avgTurnaround: number;
  riskRate: number;
  repeatCount: number;
  specialty: Array<{ specialty: string; avg: number; count: number }>;
  risk: { high: number; medium: number; low: number };
  needs: {
    pastDue: Array<{ id: string; name: string; due: string | null }>;
    lowProviders: Array<{ id: string; name: string; score: number }>;
    openActions: Array<{ id: string; title: string; dueDate: string | null }>;
  };
  providers: Array<{
    id: string;
    name: string;
    specialty: string;
    last4: number[];
    avg: number;
    count: number;
  }>;
}

/* ---------- Compliance helpers (Pulse semantic classes) ---------- */

function complianceTextClass(score: number): string {
  if (score >= 85) return "text-status-success-dot";
  if (score >= 70) return "text-status-warning-dot";
  return "text-status-danger-dot";
}

function complianceBgClass(score: number): string {
  if (score >= 85) return "bg-status-success-dot";
  if (score >= 70) return "bg-status-warning-dot";
  return "bg-status-danger-dot";
}

function compliancePillClass(score: number): string {
  if (score >= 85) return "bg-mint-100 text-status-success-fg";
  if (score >= 70) return "bg-amber-100 text-status-warning-fg";
  return "bg-critical-100 text-status-danger-fg";
}

function complianceHexFor(score: number): string {
  if (score >= 85) return "#00B582"; // mint-600
  if (score >= 70) return "#D97706"; // amber-600
  return "#DC2626"; // critical-600
}

function complianceLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "At Risk";
  return "Critical";
}

const ROLE_DESCRIPTIONS: Record<ClientRole, string> = {
  cmo: "As CMO you see strategic compliance scores, trends, and executive reports. Day-to-day case queues are hidden.",
  quality:
    "As Quality Director you have full access — operational reviews, trends, corrective actions, and exports.",
  operations:
    "As Operations Admin you focus on case flow and corrective actions. Strategic analytics are hidden.",
};

export function DashboardView(props: Props) {
  const { role, setRole } = useClientRole();
  const {
    companyName,
    projectedCompletion,
    compliance,
    reviewsThisQuarter,
    avgTurnaround,
    riskRate,
    repeatCount,
    specialty,
    risk,
    needs,
    providers,
  } = props;

  return (
    <div className="space-y-6">
      {/* Role switcher — Linear-style segmented pill */}
      <div>
        <div className="inline-flex gap-1 rounded-lg bg-ink-100 p-1">
          {(["cmo", "quality", "operations"] as ClientRole[]).map((r) => {
            const label =
              r === "cmo" ? "CMO" : r === "quality" ? "Quality Director" : "Operations Admin";
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-xs transition-all",
                  active
                    ? "bg-surface-card font-medium text-status-info-fg shadow-sm"
                    : "font-normal text-ink-secondary hover:text-ink-primary"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div
          data-testid="role-highlight"
          className="mt-3 rounded-md border-l-2 border-status-info-dot bg-status-info-bg px-3 py-2 text-small text-ink-primary"
        >
          {ROLE_DESCRIPTIONS[role]}
        </div>
      </div>

      {/* Compliance hero — cobalt gradient */}
      <Link
        href="/portal/reviews?status=completed"
        className="relative overflow-hidden rounded-xl bg-cobalt-hero p-6 flex flex-col lg:flex-row items-center gap-8 transition-all hover:shadow-lg"
      >
        <ComplianceRing score={compliance} variant="dark" />
        <div className="relative z-10 flex-1">
          <div className="text-eyebrow text-ink-primary/85 mb-2">
            {companyName} · Q1 2026 compliance
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-stat-hero text-ink-primary">{compliance}</span>
            <span className="text-h1 text-ink-primary/85">%</span>
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-md bg-white/20 backdrop-blur text-code text-ink-primary">
              {complianceLabel(compliance)}
            </span>
          </div>
          <p className="mt-3 text-body text-ink-primary/90">
            QoQ trend: +2.4% — click to view completed reviews.
          </p>
        </div>
      </Link>

      {/* Projected completion */}
      {projectedCompletion && (
        <div className="rounded-lg bg-surface-card border border-border-subtle shadow-sm p-4 flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-status-info-dot flex-shrink-0" />
          <div>
            <div className="text-eyebrow text-ink-secondary">Expected Completion</div>
            <div className="text-h3 text-ink-primary">
              {new Date(projectedCompletion).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Reviews this quarter"
          value={reviewsThisQuarter.toString()}
          href="/portal/reviews?quarter=current"
        />
        <KpiCard
          label="Avg turnaround"
          value={`${avgTurnaround}d`}
          href="/portal/reviews?status=completed"
        />
        <KpiCard
          label="Documentation risk"
          value={`${riskRate}%`}
          highlight={riskRate > 30}
          href="/portal/trends"
        />
        <KpiCard
          label="Repeat deficiencies"
          value={repeatCount.toString()}
          highlight={repeatCount > 0}
          href="/portal/trends"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg bg-surface-card border border-border-subtle shadow-sm p-6">
          <h3 className="text-h3 text-ink-primary mb-4">Compliance by Specialty</h3>
          <div className="space-y-3">
            {specialty.length === 0 && (
              <p className="text-small text-ink-secondary">No specialty data yet.</p>
            )}
            {specialty.map((s) => (
              <Link
                key={s.specialty}
                href={`/portal/reviews?specialty=${encodeURIComponent(s.specialty)}`}
                className="block group"
              >
                <div className="flex justify-between text-small text-ink-secondary mb-1 group-hover:text-ink-primary">
                  <span className="group-hover:underline">{s.specialty}</span>
                  <span>
                    {s.avg}% ({s.count})
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden bg-ink-100">
                  <div
                    className={cn("h-full transition-all group-hover:opacity-80", complianceBgClass(s.avg))}
                    style={{ width: `${Math.min(s.avg, 100)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-surface-card border border-border-subtle shadow-sm p-6">
          <h3 className="text-h3 text-ink-primary mb-4">Risk Distribution</h3>
          {/* AU-016: every slice drills via the legend below; donut as a whole drills to all-risk reviews. */}
          <Link
            href="/portal/reviews?risk=all"
            className="block hover:opacity-90"
            data-testid="risk-donut-link"
          >
            <RiskDonut risk={risk} />
          </Link>
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
            <Link
              href="/portal/reviews?risk=high"
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <span className="h-2 w-2 rounded-full bg-status-danger-dot" />
              High ({risk.high})
            </Link>
            <Link
              href="/portal/reviews?risk=medium"
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <span className="h-2 w-2 rounded-full bg-status-warning-dot" />
              Medium ({risk.medium})
            </Link>
            <Link
              href="/portal/reviews?risk=low"
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <span className="h-2 w-2 rounded-full bg-status-success-dot" />
              Low ({risk.low})
            </Link>
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      <div
        data-testid="needs-attention"
        className="rounded-lg bg-surface-card border border-border-subtle shadow-sm p-6"
      >
        <h3 className="text-h3 text-ink-primary mb-4">Needs Attention</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AttentionColumn
            icon={<AlertTriangle className="h-4 w-4 text-status-danger-dot" />}
            title="Past Due Cases"
            seeAllHref="/portal/overdue"
            items={needs.pastDue.map((c) => ({
              id: c.id,
              text: c.name,
              sub: c.due ? `Due ${new Date(c.due).toLocaleDateString()}` : null,
              href: "/portal/overdue",
            }))}
          />
          <AttentionColumn
            icon={<TrendingDown className="h-4 w-4 text-status-warning-dot" />}
            title="Providers Below 75%"
            seeAllHref="/portal/providers"
            items={needs.lowProviders.map((p) => ({
              id: p.id,
              text: p.name,
              sub: `Score: ${p.score}%`,
              href: `/portal/providers/${p.id}`,
            }))}
          />
          <AttentionColumn
            icon={<Wrench className="h-4 w-4 text-status-info-dot" />}
            title="Open Corrective Actions"
            seeAllHref="/portal/corrective"
            items={needs.openActions.map((a) => ({
              id: a.id,
              text: a.title,
              sub: a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : null,
              href: "/portal/corrective",
            }))}
          />
        </div>
      </div>

      {/* Provider table */}
      <div className="rounded-lg bg-surface-card border border-border-subtle shadow-sm p-6">
        <h3 className="text-h3 text-ink-primary mb-4">Provider Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-eyebrow text-ink-secondary border-b border-border-subtle">
                <th className="py-2 pr-3">Provider</th>
                <th className="py-2 pr-3">Specialty</th>
                <th className="py-2 pr-3">Reviews</th>
                <th className="py-2 pr-3">Trend</th>
                <th className="py-2 pr-3">Avg</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-small text-ink-secondary">
                    No providers yet.
                  </td>
                </tr>
              )}
              {providers.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border-subtle cursor-pointer hover:bg-status-info-bg"
                  onClick={() => (window.location.href = `/portal/providers/${p.id}`)}
                >
                  <td className="py-3 pr-3 text-ink-primary">{p.name}</td>
                  <td className="py-3 pr-3 text-ink-secondary">{p.specialty}</td>
                  <td className="py-3 pr-3 text-ink-secondary">{p.count}</td>
                  <td className="py-3 pr-3">
                    <Sparkline values={p.last4} />
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-code font-medium",
                        compliancePillClass(p.avg)
                      )}
                    >
                      {p.avg}%
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-ink-tertiary">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function KpiCard({
  label,
  value,
  highlight,
  href,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <div className="text-eyebrow text-ink-secondary">{label}</div>
        {highlight && (
          <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-code text-status-warning-fg">
            Watch
          </span>
        )}
      </div>
      <div className="mt-2 text-stat-large text-ink-primary">{value}</div>
    </>
  );
  const common =
    "block rounded-lg bg-surface-card border border-border-subtle shadow-sm p-4 transition-shadow hover:shadow-md";
  if (href) {
    return (
      <Link href={href} data-testid="kpi-card" className={common}>
        {body}
      </Link>
    );
  }
  return (
    <div data-testid="kpi-card" className={common}>
      {body}
    </div>
  );
}

function ComplianceRing({
  score,
  variant = "light",
}: {
  score: number;
  variant?: "light" | "dark";
}) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const trackStroke = variant === "dark" ? "rgba(255,255,255,0.18)" : "var(--ink-100)";
  const fillStroke = variant === "dark" ? "#FFFFFF" : complianceHexFor(score);
  const labelClass =
    variant === "dark" ? "text-h1 text-ink-primary" : `text-h1 ${complianceTextClass(score)}`;

  return (
    <div data-testid="compliance-ring" className="relative h-40 w-40 flex-shrink-0">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        <circle cx="80" cy="80" r={radius} stroke={trackStroke} strokeWidth="14" fill="none" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke={fillStroke}
          strokeWidth="14"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={labelClass}>{score}%</span>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <span className="text-code text-ink-tertiary">—</span>;
  }
  const max = Math.max(...values, 100);
  return (
    <div className="flex items-end gap-0.5 h-8 w-16">
      {values.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-sm", complianceBgClass(v))}
          style={{
            height: `${(v / max) * 100}%`,
            minHeight: "2px",
          }}
        />
      ))}
    </div>
  );
}

function RiskDonut({ risk }: { risk: { high: number; medium: number; low: number } }) {
  const data = [
    { name: "High",   value: risk.high,   fill: "#DC2626" }, // critical-600
    { name: "Medium", value: risk.medium, fill: "#D97706" }, // amber-600
    { name: "Low",    value: risk.low,    fill: "#00B582" }, // mint-600
  ];
  const total = risk.high + risk.medium + risk.low;
  if (total === 0) {
    return (
      <p className="text-small text-ink-secondary h-48 flex items-center justify-center">
        No data yet
      </p>
    );
  }
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
          <ReTooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--ink-200)",
              color: "var(--ink-900)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "var(--ink-600)" }}
            formatter={(v) => <span style={{ color: "var(--ink-600)" }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function AttentionColumn({
  icon,
  title,
  items,
  seeAllHref,
}: {
  icon: React.ReactNode;
  title: string;
  items: Array<{ id: string; text: string; sub: string | null; href?: string }>;
  seeAllHref?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-eyebrow text-ink-secondary">{title}</span>
        </div>
        {seeAllHref && items.length > 0 && (
          <Link href={seeAllHref} className="text-code text-status-info-dot hover:text-status-info-fg hover:underline">
            See all →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-small text-ink-tertiary">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => {
            const inner = (
              <>
                <div className="text-small text-ink-primary truncate">{i.text}</div>
                {i.sub && <div className="text-code text-ink-secondary">{i.sub}</div>}
              </>
            );
            return (
              <li key={i.id} className="rounded-md bg-surface-canvas border border-border-subtle p-2">
                {i.href ? (
                  <Link href={i.href} className="block hover:opacity-80">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
