"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CasesByCompany {
  name: string;
  count: number;
}

interface CasesByStatus {
  status: string;
  count: number;
  color: string;
}

interface CaseStatusChartProps {
  casesByCompany: CasesByCompany[];
  casesByStatus: CasesByStatus[];
}

export function CaseStatusChart({
  casesByCompany,
  casesByStatus,
}: CaseStatusChartProps) {
  const totalCases = casesByStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Bar Chart - Cases by Company */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Cases by Company
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Last 30 days
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {casesByCompany.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No case data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={casesByCompany}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7280" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value) => [value, "Cases"]}
                />
                <Bar
                  dataKey="count"
                  fill="#1D4ED8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pie/Donut Chart - Cases by Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Cases by Status
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {totalCases} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {casesByStatus.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No case data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={casesByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {casesByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value, name) => [value, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-ink-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
