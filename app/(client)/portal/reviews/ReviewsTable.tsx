"use client";

import { useMemo, useState } from "react";

interface Row {
  id: string;
  status: string;
  specialty: string;
  providerName: string;
  chartFileName: string;
  assignedAt: string | null;
  dueDate: string | null;
  createdAt: string | null;
}

function quarterOf(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
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

export function ReviewsTable({ rows }: { rows: Row[] }) {
  const [status, setStatus] = useState<string>("all");
  const [specialty, setSpecialty] = useState<string>("all");
  const [quarter, setQuarter] = useState<string>("all");

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
    return true;
  });

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-3 rounded-lg p-4"
        style={{ backgroundColor: "#1A3050" }}
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

      <div className="rounded-lg p-6" style={{ backgroundColor: "#1A3050" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs uppercase text-gray-500 border-b"
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
                  <td colSpan={6} className="py-4 text-center text-gray-400">
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
                  <td className="py-3 pr-3 text-white truncate max-w-xs">
                    {r.chartFileName}
                  </td>
                  <td className="py-3 pr-3 text-gray-300">{r.providerName}</td>
                  <td className="py-3 pr-3 text-gray-400">{r.specialty}</td>
                  <td className="py-3 pr-3">
                    <span
                      className="rounded px-2 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: `${statusColor(r.status)}22`,
                        color: statusColor(r.status),
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-gray-400">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-3 text-gray-400">
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
      <label className="text-xs uppercase tracking-wider text-gray-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md px-3 py-1.5 text-sm text-white"
        style={{ backgroundColor: "#0B1829", border: "1px solid #2A3F5F" }}
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
