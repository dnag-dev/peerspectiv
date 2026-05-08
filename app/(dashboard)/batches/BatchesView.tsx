"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BatchRow {
  id: string;
  batch_name: string;
  company_id: string | null;
  company_name: string | null;
  specialty: string | null;
  date_uploaded: string;
  total_cases: number;
  assigned_cases: number;
  completed_cases: number;
  status: string;
}

interface Props {
  batches: BatchRow[];
}

type SortKey =
  | "batch_name"
  | "company_name"
  | "date_uploaded"
  | "total_cases"
  | "completed_cases"
  | "status";
type SortDir = "asc" | "desc";

function BatchStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-100 text-status-warning-fg",
    in_progress: "bg-status-info-bg text-status-info-dot",
    completed: "bg-mint-100 text-status-info-fg",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        variants[status] || variants.pending
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BatchesView({ batches }: Props) {
  const [searchQ, setSearchQ] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_uploaded");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of batches) {
      if (b.company_id && b.company_name) map.set(b.company_id, b.company_name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [batches]);

  const statuses = useMemo(() => {
    const s = new Set<string>();
    for (const b of batches) if (b.status) s.add(b.status);
    return Array.from(s).sort();
  }, [batches]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return batches.filter((b) => {
      if (companyFilter !== "all" && b.company_id !== companyFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.batch_name.toLowerCase().includes(q) ||
        (b.company_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [batches, companyFilter, statusFilter, searchQ]);

  const visible = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: number | string = "";
      let bv: number | string = "";
      switch (sortKey) {
        case "batch_name":
          av = a.batch_name.toLowerCase();
          bv = b.batch_name.toLowerCase();
          break;
        case "company_name":
          av = (a.company_name ?? "").toLowerCase();
          bv = (b.company_name ?? "").toLowerCase();
          break;
        case "date_uploaded":
          av = new Date(a.date_uploaded).getTime();
          bv = new Date(b.date_uploaded).getTime();
          break;
        case "total_cases":
          av = a.total_cases;
          bv = b.total_cases;
          break;
        case "completed_cases":
          av = a.completed_cases;
          bv = b.completed_cases;
          break;
        case "status":
          av = a.status;
          bv = b.status;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function SortHead({
    label,
    k,
    align = "left",
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right" | "center";
  }) {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        onClick={() => toggleSort(k)}
        className={`px-4 py-3 cursor-pointer select-none hover:text-ink-primary ${
          align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
        }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`h-3 w-3 ${active ? "text-status-info-dot" : "text-ink-tertiary"}`} />
        </span>
      </th>
    );
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="mb-4 h-12 w-12 text-ink-tertiary" />
          <h3 className="text-lg font-medium text-ink-primary">No batches yet</h3>
          <p className="mt-1 text-sm text-ink-secondary">
            Batches appear here when cases are uploaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search tag name, company…"
                className="pl-9"
              />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-ink-secondary">
            Showing <strong>{visible.length}</strong> of {batches.length} batches
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-secondary text-xs uppercase">
              <tr>
                <SortHead label="Tag Name" k="batch_name" />
                <SortHead label="Company" k="company_name" />
                <th className="px-4 py-3 text-left">Specialty</th>
                <SortHead label="Upload Date" k="date_uploaded" />
                <SortHead label="Total Cases" k="total_cases" align="center" />
                <SortHead label="Completed" k="completed_cases" align="center" />
                <SortHead label="Status" k="status" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-secondary">
                    No batches match your filters.
                  </td>
                </tr>
              )}
              {visible.map((batch) => (
                <tr key={batch.id} className="border-t border-border-subtle hover:bg-ink-50/50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/batches/${batch.id}`}
                      className="text-status-info-dot hover:underline"
                    >
                      {batch.batch_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{batch.company_name || "—"}</td>
                  <td className="px-4 py-3 text-ink-secondary">{batch.specialty || "—"}</td>
                  <td className="px-4 py-3 text-ink-secondary">{formatDate(batch.date_uploaded)}</td>
                  <td className="px-4 py-3 text-center text-ink-primary">{batch.total_cases}</td>
                  <td className="px-4 py-3 text-center text-ink-primary">{batch.completed_cases}</td>
                  <td className="px-4 py-3">
                    <BatchStatusBadge status={batch.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
