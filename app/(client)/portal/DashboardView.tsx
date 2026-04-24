"use client";

import { useMemo, useState } from "react";
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

const CARD_BG = "#1A3050";
const ACCENT = "#2E6FE8";
const SUCCESS = "#22C55E";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";

function complianceColor(score: number) {
  if (score >= 85) return SUCCESS;
  if (score >= 70) return WARNING;
  return DANGER;
}

function complianceLabel(score: number) {
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
      {/* Role switcher */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: CARD_BG }}
      >
        <div className="flex flex-wrap gap-2">
          {(["cmo", "quality", "operations"] as ClientRole[]).map((r) => {
            const label =
              r === "cmo" ? "CMO" : r === "quality" ? "Quality Director" : "Operations Admin";
            const active = role === r;
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? ACCENT : "transparent",
                  color: active ? "white" : "#CBD5E1",
                  border: `1px solid ${active ? ACCENT : "#2A3F5F"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div
          data-testid="role-highlight"
          className="mt-3 rounded-md p-3 text-sm"
          style={{
            backgroundColor: "rgba(46,111,232,0.12)",
            borderLeft: `3px solid ${ACCENT}`,
            color: "#DBE4F5",
          }}
        >
          {ROLE_DESCRIPTIONS[role]}
        </div>
      </div>

      {/* Compliance banner */}
      <Link
        href="/portal/reviews?status=completed"
        className="rounded-lg p-6 flex flex-col lg:flex-row items-center gap-8 transition-all hover:ring-2 hover:ring-blue-500/40"
        style={{ backgroundColor: CARD_BG }}
      >
        <ComplianceRing score={compliance} />
        <div>
          <div className="text-5xl font-bold text-white">{compliance}%</div>
          <div
            className="mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              backgroundColor: `${complianceColor(compliance)}22`,
              color: complianceColor(compliance),
            }}
          >
            {complianceLabel(compliance)}
          </div>
          <p className="mt-3 text-sm text-gray-400">
            {companyName} — Compliance score this quarter
          </p>
          <p className="mt-1 text-xs text-gray-500">QoQ trend: +2.4% · Click to view completed reviews</p>
        </div>
      </Link>

      {/* Projected completion */}
      {projectedCompletion && (
        <div
          className="rounded-lg p-4 flex items-center gap-3"
          style={{ backgroundColor: CARD_BG, borderLeft: `3px solid ${ACCENT}` }}
        >
          <CalendarDays className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">Expected Completion</div>
            <div className="text-lg font-semibold text-white">
              {new Date(projectedCompletion).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
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
        <div className="lg:col-span-2 rounded-lg p-6" style={{ backgroundColor: CARD_BG }}>
          <h3 className="text-sm font-semibold text-white mb-4">
            Compliance by Specialty
          </h3>
          <div className="space-y-3">
            {specialty.length === 0 && (
              <p className="text-sm text-gray-400">No specialty data yet.</p>
            )}
            {specialty.map((s) => (
              <Link
                key={s.specialty}
                href={`/portal/reviews?specialty=${encodeURIComponent(s.specialty)}`}
                className="block group"
              >
                <div className="flex justify-between text-xs text-gray-300 mb-1 group-hover:text-white">
                  <span className="group-hover:underline">{s.specialty}</span>
                  <span>
                    {s.avg}% ({s.count})
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#0B1829" }}>
                  <div
                    className="h-full transition-all group-hover:opacity-80"
                    style={{
                      width: `${Math.min(s.avg, 100)}%`,
                      backgroundColor: complianceColor(s.avg),
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: CARD_BG }}>
          <h3 className="text-sm font-semibold text-white mb-4">Risk Distribution</h3>
          <RiskDonut risk={risk} />
        </div>
      </div>

      {/* Needs Attention */}
      <div
        data-testid="needs-attention"
        className="rounded-lg p-6"
        style={{ backgroundColor: CARD_BG }}
      >
        <h3 className="text-sm font-semibold text-white mb-4">Needs Attention</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AttentionColumn
            icon={<AlertTriangle className="h-4 w-4" style={{ color: DANGER }} />}
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
            icon={<TrendingDown className="h-4 w-4" style={{ color: WARNING }} />}
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
            icon={<Wrench className="h-4 w-4" style={{ color: ACCENT }} />}
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
      <div className="rounded-lg p-6" style={{ backgroundColor: CARD_BG }}>
        <h3 className="text-sm font-semibold text-white mb-4">Provider Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500 border-b" style={{ borderColor: "#2A3F5F" }}>
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
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    No providers yet.
                  </td>
                </tr>
              )}
              {providers.map((p) => (
                <tr
                  key={p.id}
                  className="border-b cursor-pointer hover:bg-white/5"
                  style={{ borderColor: "#2A3F5F" }}
                  onClick={() => (window.location.href = `/portal/providers/${p.id}`)}
                >
                  <td className="py-3 pr-3 text-white">{p.name}</td>
                  <td className="py-3 pr-3 text-gray-400">{p.specialty}</td>
                  <td className="py-3 pr-3 text-gray-400">{p.count}</td>
                  <td className="py-3 pr-3">
                    <Sparkline values={p.last4} />
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className="rounded px-2 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: `${complianceColor(p.avg)}22`,
                        color: complianceColor(p.avg),
                      }}
                    >
                      {p.avg}%
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-gray-500">
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
      <div className="text-xs uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </>
  );
  const common = "rounded-lg p-4 block";
  const style = {
    backgroundColor: CARD_BG,
    borderLeft: `3px solid ${highlight ? WARNING : ACCENT}`,
  };
  if (href) {
    return (
      <Link
        href={href}
        data-testid="kpi-card"
        className={`${common} transition-all hover:ring-2 hover:ring-blue-500/40`}
        style={style}
      >
        {body}
      </Link>
    );
  }
  return (
    <div data-testid="kpi-card" className={common} style={style}>
      {body}
    </div>
  );
}

function ComplianceRing({ score }: { score: number }) {
  const color = complianceColor(score);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  return (
    <div data-testid="compliance-ring" className="relative h-40 w-40 flex-shrink-0">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        <circle cx="80" cy="80" r={radius} stroke="#0B1829" strokeWidth="14" fill="none" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke={color}
          strokeWidth="14"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}%</span>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  const max = Math.max(...values, 100);
  return (
    <div className="flex items-end gap-0.5 h-8 w-16">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: complianceColor(v),
            minHeight: "2px",
          }}
        />
      ))}
    </div>
  );
}

function RiskDonut({ risk }: { risk: { high: number; medium: number; low: number } }) {
  const data = [
    { name: "High", value: risk.high, fill: DANGER },
    { name: "Medium", value: risk.medium, fill: WARNING },
    { name: "Low", value: risk.low, fill: SUCCESS },
  ];
  const total = risk.high + risk.medium + risk.low;
  if (total === 0) {
    return (
      <p className="text-sm text-gray-400 h-48 flex items-center justify-center">
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
            contentStyle={{ backgroundColor: "#0B1829", border: "1px solid #2A3F5F", color: "white" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#CBD5E1" }}
            formatter={(v) => <span style={{ color: "#CBD5E1" }}>{v}</span>}
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
          <span className="text-xs uppercase tracking-wider text-gray-400">{title}</span>
        </div>
        {seeAllHref && items.length > 0 && (
          <Link href={seeAllHref} className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline">
            See all →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => {
            const inner = (
              <>
                <div className="text-sm text-white truncate">{i.text}</div>
                {i.sub && <div className="text-xs text-gray-400">{i.sub}</div>}
              </>
            );
            return (
              <li
                key={i.id}
                className="rounded-md p-2"
                style={{ backgroundColor: "#0B1829" }}
              >
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
