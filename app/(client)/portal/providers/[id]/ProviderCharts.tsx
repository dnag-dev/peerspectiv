"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ProviderCharts({
  last6,
}: {
  last6: Array<{ label: string; score: number }>;
}) {
  if (last6.length === 0) return null;
  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: "#1E3A8A" }}>
      <h3 className="text-sm font-semibold text-white mb-3">Score Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={last6}>
            <CartesianGrid stroke="#2A3F5F" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#172554",
                border: "1px solid #2A3F5F",
                color: "white",
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ fill: "#2563EB" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
