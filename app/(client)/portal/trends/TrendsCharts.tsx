"use client";

import { useRouter } from "next/navigation";
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
  monthly: Array<{ key: string; label: string; avg: number; count: number }>;
  topMissed: Array<{ criterion: string; count: number }>;
}

function color(score: number) {
  if (score >= 85) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

export function TrendsCharts({ monthly, topMissed }: Props) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg p-6" style={{ backgroundColor: "#1A3050" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Monthly Compliance (last 6 months)
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-ink-500">
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
                  backgroundColor: "#0B1829",
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

      <div className="rounded-lg p-6" style={{ backgroundColor: "#1A3050" }}>
        <h3 className="text-sm font-semibold text-white mb-3">
          Top 5 Most Missed Criteria
        </h3>
        {topMissed.length === 0 ? (
          <p className="text-sm text-ink-400">No deficiency data.</p>
        ) : (
          <ul className="space-y-3">
            {topMissed.map((t, i) => {
              const max = topMissed[0].count || 1;
              return (
                <li key={t.criterion}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/portal/reviews?criterion=${encodeURIComponent(t.criterion)}`
                      )
                    }
                    className="group w-full text-left"
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-300 truncate pr-2 group-hover:text-white group-hover:underline">
                        {i + 1}. {t.criterion}
                      </span>
                      <span className="text-warning-600">{t.count}</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#0B1829" }}
                    >
                      <div
                        className="h-full transition-opacity group-hover:opacity-80"
                        style={{
                          width: `${(t.count / max) * 100}%`,
                          backgroundColor: "#EF4444",
                        }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
