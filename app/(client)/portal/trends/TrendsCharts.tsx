"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface MissedCriterion {
  criterion: string;
  count: number;
  noPct: number;
  quarters: Array<{ quarter: string; noPct: number }>;
}

interface Props {
  monthly: Array<{ key: string; label: string; avg: number; count: number }>;
  topMissed: MissedCriterion[];
}

function color(score: number) {
  if (score >= 85) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

export function TrendsCharts({ monthly, topMissed }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)' }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink-primary">
            Monthly Compliance (last 6 months)
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-ink-secondary">
            Click a bar to drill into that month
          </span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthly}
              onClick={(e: any) => {
                const p = e?.activePayload?.[0]?.payload;
                if (p?.key) router.push(`/portal/reviews?month=${p.key}`);
              }}
            >
              <CartesianGrid stroke="#2A3F5F" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
              <Tooltip
                cursor={{ fill: "#ffffff10" }}
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: "1px solid #2A3F5F",
                  color: "white",
                }}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}>
                {monthly.map((m, i) => (
                  <Cell key={i} fill={color(m.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)' }}>
        <h3 className="text-sm font-medium text-ink-primary mb-3">
          Most Missed Criteria (sorted by % no, descending)
        </h3>
        {topMissed.length === 0 ? (
          <p className="text-sm text-ink-tertiary">No deficiency data.</p>
        ) : (
          <table className="w-full text-xs text-ink-primary">
            <thead>
              <tr className="text-ink-tertiary border-b border-ink-700/60">
                <th className="text-left py-2 font-medium">Criterion</th>
                <th className="text-right py-2 font-medium">% No</th>
                <th className="text-right py-2 font-medium">No Count</th>
              </tr>
            </thead>
            <tbody>
              {topMissed.map((t) => {
                const isOpen = expanded === t.criterion;
                return (
                  <>
                    <tr
                      key={t.criterion}
                      className="border-b border-ink-700/30 cursor-pointer hover:bg-white/5"
                      onClick={() =>
                        setExpanded(isOpen ? null : t.criterion)
                      }
                    >
                      <td className="py-2 pr-2">
                        <span className="text-ink-tertiary">
                          {isOpen ? "▼" : "▶"} {t.criterion}
                        </span>
                      </td>
                      <td className="py-2 text-right text-amber-400">
                        {t.noPct}%
                      </td>
                      <td className="py-2 text-right text-ink-tertiary">
                        {t.count}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${t.criterion}-trend`}>
                        <td colSpan={3} className="py-3 pl-4 pr-2">
                          {t.quarters.length === 0 ? (
                            <p className="text-ink-tertiary text-xs">
                              No quarterly data.
                            </p>
                          ) : (
                            <div className="h-36">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={t.quarters}>
                                  <CartesianGrid
                                    stroke="#2A3F5F"
                                    strokeDasharray="3 3"
                                  />
                                  <XAxis
                                    dataKey="quarter"
                                    stroke="#94A3B8"
                                    fontSize={10}
                                  />
                                  <YAxis
                                    domain={[0, 100]}
                                    stroke="#94A3B8"
                                    fontSize={10}
                                    tickFormatter={(v: number) => `${v}%`}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: 'var(--color-card)',
                                      border: "1px solid #2A3F5F",
                                      color: "white",
                                      fontSize: 11,
                                    }}
                                    formatter={(v: unknown) => [`${v}%`, "% No"] as [string, string]}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="noPct"
                                    stroke="#EF4444"
                                    strokeWidth={2}
                                    dot
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
