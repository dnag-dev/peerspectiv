"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

interface Row {
  id: string;
  status: string;
  specialty: string;
  providerName: string;
  chartFileName: string;
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
    if (specialty !== "all" && r.specialty !== specialty) return false;
    if (quarter !== "all" && quarterOf(r.createdAt) !== quarter) return false;
    if (month) {
      // Month drill comes from Trends (compliance bar) — match the month of submission.
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

      <div
        className="flex flex-wrap gap-3 rounded-lg p-4"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["all", "unassigned", "assigned", "in_progress", "completed", "past_due"]}
        />
        <FilterSelect
          label="Specialty"
          value={specialty}
          onChange={setSpecialty}
          options={["all", ...specialties]}
        />
        <FilterSelect
          label="Quarter"
          value={quarter}
          onChange={setQuarter}
          options={["all", ...quarters]}
        />
      </div>

      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs uppercase text-ink-secondary border-b"
                style={{ borderColor: "#2A3F5F" }}
              >
                <th className="py-2 pr-3">Case</th>
                <th className="py-2 pr-3">Provider</th>
                <th className="py-2 pr-3">Specialty</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Due</th>
                <th className="py-2 pr-3">Quarter</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-ink-tertiary">
                    No matching reviews.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b"
                  style={{ borderColor: "#2A3F5F" }}
                >
                  <td className="py-3 pr-3 text-ink-primary truncate max-w-xs">
                    {r.chartFileName}
                  </td>
                  <td className="py-3 pr-3 text-ink-tertiary">{r.providerName}</td>
                  <td className="py-3 pr-3 text-ink-tertiary">{r.specialty}</td>
                  <td className="py-3 pr-3">
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${statusColor(r.status)}22`,
                        color: statusColor(r.status),
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-ink-tertiary">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-3 text-ink-tertiary">
                    {quarterOf(r.createdAt)}
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wider text-ink-tertiary">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md px-3 py-1.5 text-sm text-ink-primary"
        style={{ backgroundColor: 'var(--color-card)', border: "1px solid #2A3F5F" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
