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
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)' }}>
      <h3 className="text-sm font-medium text-ink-primary mb-3">Score Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={last6}>
            <CartesianGrid stroke="#E5E5E0" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#4D4C48" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#4D4C48" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: "1px solid #E5E5E0",
                color: "white",
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0F6E56"
              strokeWidth={2}
              dot={{ fill: "#0F6E56" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
