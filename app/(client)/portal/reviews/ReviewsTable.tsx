"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";

interface Row {
  id: string;
  status: string;
  specialty: string;
  providerName: string;
  chartFileName: string;
  chartFilePath: string | null;
  batchName: string | null;
  dueDate: string | null;
  createdAt: string | null;
}

interface Filters {
  status: string[];
  provider: string;
  specialty: string;
  dateFrom: string;
  dateTo: string;
}

const STATUS_OPTIONS = [
  { key: "unassigned", label: "Unassigned" },
  { key: "pending_approval", label: "Pending approval" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "past_due", label: "Past due" },
  { key: "returned_by_peer", label: "Returned by peer" },
];

const STATUS_COLOR: Record<string, string> = {
  completed: "#22C55E",
  past_due: "#EF4444",
  returned_by_peer: "#64748B",
  in_progress: "#F59E0B",
  assigned: "#F59E0B",
  pending_approval: "#F59E0B",
  unassigned: "#94A3B8",
};

export function ReviewsTable({
  rows,
  initialFilters,
}: {
  rows: Row[];
  initialFilters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<Filters>(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  function applyFilters(next: Filters) {
    const sp = new URLSearchParams();
    if (next.status.length) sp.set("status", next.status.join(","));
    if (next.provider) sp.set("provider", next.provider);
    if (next.specialty) sp.set("specialty", next.specialty);
    if (next.dateFrom) sp.set("dateFrom", next.dateFrom);
    if (next.dateTo) sp.set("dateTo", next.dateTo);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  function toggleStatus(key: string) {
    const next = filters.status.includes(key)
      ? filters.status.filter((s) => s !== key)
      : [...filters.status, key];
    const updated = { ...filters, status: next };
    setFilters(updated);
    applyFilters(updated);
  }

  return (
    <div className="space-y-4">
      {/* Filters card */}
      <div className="space-y-3 rounded-lg border border-border-subtle bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => {
            const on = filters.status.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleStatus(s.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-border-subtle text-ink-primary hover:border-blue-500"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <input
            value={filters.provider}
            onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
            onBlur={() => applyFilters(filters)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters(filters)}
            placeholder="Provider"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
          <input
            value={filters.specialty}
            onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
            onBlur={() => applyFilters(filters)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters(filters)}
            placeholder="Specialty"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => {
              const v = { ...filters, dateFrom: e.target.value };
              setFilters(v);
              applyFilters(v);
            }}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => {
              const v = { ...filters, dateTo: e.target.value };
              setFilters(v);
              applyFilters(v);
            }}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-gray-50 text-left">
            <tr className="text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Chart</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Batch</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  No matching reviews.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border-subtle hover:bg-gray-50">
                <td className="px-4 py-3">
                  {r.chartFilePath ? (
                    <a href={r.chartFilePath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px] block">
                      {r.chartFileName}
                    </a>
                  ) : (
                    <span className="text-ink-primary truncate max-w-[200px] block">{r.chartFileName}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-primary">{r.providerName}</td>
                <td className="px-4 py-3 text-gray-500">{r.specialty}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${STATUS_COLOR[r.status] ?? "#94A3B8"}18`,
                      color: STATUS_COLOR[r.status] ?? "#94A3B8",
                    }}
                  >
                    {r.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">{r.batchName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
