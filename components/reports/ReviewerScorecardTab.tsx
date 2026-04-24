"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReviewerRow {
  id: string;
  full_name: string;
  specialty: string;
  total_reviews_completed: number;
  ai_agreement_score: number | null;
  quality_score: number | null;
  status: "active" | "inactive";
}

type SortKey = keyof Pick<
  ReviewerRow,
  | "full_name"
  | "specialty"
  | "total_reviews_completed"
  | "ai_agreement_score"
  | "quality_score"
  | "status"
>;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BAR_COLOR = "#1E4DB7";
const BAR_COLOR_LOW = "#EF4444";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ReviewerScorecardTab() {
  const [reviewers, setReviewers] = useState<ReviewerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reports/reviewers");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = (await res.json()) as { data: ReviewerRow[] };
        setReviewers(json.data ?? []);
      } catch {
        setReviewers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sorted = useMemo(() => {
    const copy = [...reviewers];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return copy;
  }, [reviewers, sortKey, sortDir]);

  const chartData = useMemo(
    () =>
      reviewers
        .filter((r) => r.ai_agreement_score != null)
        .map((r) => ({
          name: r.full_name.split(" ").slice(-1)[0], // Last name for brevity
          fullName: r.full_name,
          agreement: Math.round(r.ai_agreement_score!),
        }))
        .sort((a, b) => b.agreement - a.agreement),
    [reviewers]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (reviewers.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No reviewer data available.
      </div>
    );
  }

  function SortableHeader({
    label,
    column,
    className,
  }: {
    label: string;
    column: SortKey;
    className?: string;
  }) {
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => handleSort(column)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {label}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agreement rate chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Reviewer Agreement Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 24, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`${value}%`, "Agreement Rate"]}
                    labelFormatter={(_: unknown, payload: unknown) => {
                      const items = payload as Array<{ payload?: { fullName?: string } }> | undefined;
                      return items?.[0]?.payload?.fullName ?? "";
                    }}
                  />
                  <Bar dataKey="agreement" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.agreement < 70 ? BAR_COLOR_LOW : BAR_COLOR}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Reviewer Name" column="full_name" />
              <SortableHeader label="Specialty" column="specialty" />
              <SortableHeader
                label="Cases Completed"
                column="total_reviews_completed"
                className="text-right"
              />
              <SortableHeader
                label="Agreement Rate"
                column="ai_agreement_score"
                className="text-right"
              />
              <SortableHeader
                label="Quality Score"
                column="quality_score"
                className="text-right"
              />
              <SortableHeader label="Status" column="status" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/reviewers/${r.id}`}
                    className="text-brand-navy hover:underline"
                  >
                    {r.full_name}
                  </Link>
                </TableCell>
                <TableCell>{r.specialty}</TableCell>
                <TableCell className="text-right">
                  {r.total_reviews_completed}
                </TableCell>
                <TableCell className="text-right">
                  {r.ai_agreement_score != null
                    ? `${r.ai_agreement_score.toFixed(1)}%`
                    : "--"}
                </TableCell>
                <TableCell className="text-right">
                  {r.quality_score != null
                    ? r.quality_score.toFixed(1)
                    : "--"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={r.status === "active" ? "success" : "secondary"}
                  >
                    {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
