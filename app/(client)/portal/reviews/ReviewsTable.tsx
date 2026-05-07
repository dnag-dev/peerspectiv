"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

interface Row {
  id: string;
  status: string;
  specialty: string;
  providerName: string;
  chartFileName: string;
  chartFilePath: string | null;
  batchName: string | null;
  assignedAt: string | null;
  dueDate: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  deficiencies: string[];
}

function quarterOf(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function monthKeyOf(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function statusColor(s: string) {
  switch (s) {
    case "completed":
      return "#22C55E";
    case "past_due":
      return "#EF4444";
    case "in_progress":
    case "assigned":
      return "#F59E0B";
    default:
      return "#94A3B8";
  }
}

export function ReviewsTable({
  rows,
  initialMonth = null,
  initialCriterion = null,
  initialStatus = "all",
  initialSpecialty = "all",
  initialQuarter = "all",
}: {
  rows: Row[];
  initialMonth?: string | null;
  initialCriterion?: string | null;
  initialStatus?: string;
  initialSpecialty?: string;
  initialQuarter?: string;
}) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [specialty, setSpecialty] = useState<string>(initialSpecialty);
  const [quarter, setQuarter] = useState<string>(initialQuarter);
  const [month, setMonth] = useState<string | null>(initialMonth);
  const [criterion, setCriterion] = useState<string | null>(initialCriterion);
  const [providerSearch, setProviderSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const specialties = useMemo(
    () => Array.from(new Set(rows.map((r) => r.specialty).filter(Boolean))),
    [rows]
  );
  const quarters = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => quarterOf(r.createdAt)).filter(Boolean))),
    [rows]
  );

  const filtered = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (specialty !== "all" && !r.specialty.toLowerCase().includes(specialty.toLowerCase())) return false;
    if (quarter !== "all" && quarterOf(r.createdAt) !== quarter) return false;
    if (providerSearch.trim()) {
      if (!r.providerName.toLowerCase().includes(providerSearch.toLowerCase())) return false;
    }
    if (dateFrom) {
      const caseDate = r.createdAt || r.assignedAt;
      if (!caseDate || caseDate < dateFrom) return false;
    }
    if (dateTo) {
      const caseDate = r.createdAt || r.assignedAt;
      if (!caseDate || caseDate > dateTo + "T23:59:59") return false;
    }
    if (month) {
      if (monthKeyOf(r.submittedAt) !== month) return false;
    }
    if (criterion) {
      const needle = criterion.toLowerCase();
      const hit = r.deficiencies.some((d) => d.toLowerCase().includes(needle));
      if (!hit) return false;
    }
    return true;
  });

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      {(month || criterion) && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg p-3"
          style={{ backgroundColor: 'var(--color-card)', border: "1px solid #00C896" }}
        >
          <span className="text-xs uppercase tracking-wider text-mint-200">
            Drilled down from Trends
          </span>
          {month && (
            <button
              onClick={() => setMonth(null)}
              className="flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-xs text-mint-200 hover:bg-brand/20"
            >
              Month: {monthLabel} <X className="h-3 w-3" />
            </button>
          )}
          {criterion && (
            <button
              onClick={() => setCriterion(null)}
              className="flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-xs text-mint-200 hover:bg-brand/20"
            >
              Criterion: {criterion} <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => {
              setMonth(null);
              setCriterion(null);
            }}
            className="ml-auto text-xs text-ink-tertiary hover:text-ink-primary"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filters card — matches admin Reviews style */}
      <div className="space-y-3 rounded-lg border border-border-subtle bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "unassigned", label: "Unassigned" },
            { key: "pending_approval", label: "Pending approval" },
            { key: "assigned", label: "Assigned" },
            { key: "in_progress", label: "In progress" },
            { key: "completed", label: "Completed" },
            { key: "past_due", label: "Past due" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(status === s.key ? "all" : s.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                status === s.key
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-border-subtle text-ink-primary hover:border-blue-500"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <input
            value={providerSearch}
            onChange={(e) => setProviderSearch(e.target.value)}
            placeholder="Provider"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
          <input
            value={specialty === "all" ? "" : specialty}
            onChange={(e) => setSpecialty(e.target.value || "all")}
            placeholder="Specialty"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Table — matches admin style */}
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  No matching reviews.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
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
                      backgroundColor: `${statusColor(r.status)}18`,
                      color: statusColor(r.status),
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

