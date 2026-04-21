"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  monthly: Array<{ label: string; avg: number; count: number }>;
  topMissed: Array<{ criterion: string; count: number }>;
}

function color(score: number) {
  if (score >= 85) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

export function TrendsCharts({ monthly, topMissed }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg p-6" style={{ backgroundColor: "#1A3050" }}>
        <h3 className="text-sm font-semibold text-white mb-3">
          Monthly Compliance (last 6 months)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid stroke="#2A3F5F" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0B1829",
                  border: "1px solid #2A3F5F",
                  color: "white",
                }}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {monthly.map((m, i) => (
                  <Cell key={i} fill={color(m.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg p-6" style={{ backgroundColor: "#1A3050" }}>
        <h3 className="text-sm font-semibold text-white mb-3">
          Top 5 Most Missed Criteria
        </h3>
        {topMissed.length === 0 ? (
          <p className="text-sm text-gray-400">No deficiency data.</p>
        ) : (
          <ul className="space-y-3">
            {topMissed.map((t, i) => {
              const max = topMissed[0].count || 1;
              return (
                <li key={t.criterion}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 truncate pr-2">
                      {i + 1}. {t.criterion}
                    </span>
                    <span className="text-amber-400">{t.count}</span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#0B1829" }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${(t.count / max) * 100}%`,
                        backgroundColor: "#EF4444",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
