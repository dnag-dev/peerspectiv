"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyActions } from "@/components/companies/CompanyActions";
import type { Company } from "@/types";

interface CompanyRow extends Company {
  provider_count: number;
  active_case_count: number;
}

interface Props {
  companies: CompanyRow[];
}

type SortKey =
  | "name"
  | "contact_person"
  | "provider_count"
  | "active_case_count"
  | "status";
type SortDir = "asc" | "desc";

export function CompaniesView({ companies }: Props) {
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return companies.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.contact_person ?? "").toLowerCase().includes(q) ||
        (c.contact_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [companies, statusFilter, searchQ]);

  const visible = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: number | string = "";
      let bv: number | string = "";
      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "contact_person":
          av = (a.contact_person ?? "").toLowerCase();
          bv = (b.contact_person ?? "").toLowerCase();
          break;
        case "provider_count":
          av = a.provider_count;
          bv = b.provider_count;
          break;
        case "active_case_count":
          av = a.active_case_count;
          bv = b.active_case_count;
          break;
        case "status":
          av = a.status ?? "";
          bv = b.status ?? "";
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
        className={`px-4 py-3 cursor-pointer select-none hover:text-ink-900 ${
          align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
        }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`h-3 w-3 ${active ? "text-cobalt-600" : "text-ink-300"}`} />
        </span>
      </th>
    );
  }

  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="mb-4 h-12 w-12 text-ink-300" />
          <h3 className="text-lg font-medium text-ink-900">No companies yet</h3>
          <p className="mt-1 text-sm text-ink-500">
            Get started by adding your first company.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search name, contact person, email…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="contract_sent">Contract Sent</SelectItem>
                <SelectItem value="contract_signed">Contract Signed</SelectItem>
                <SelectItem value="in_cycle">In Cycle</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Showing <strong>{visible.length}</strong> of {companies.length} companies
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-600 text-xs uppercase">
              <tr>
                <SortHead label="Company Name" k="name" />
                <SortHead label="Contact Person" k="contact_person" />
                <th className="px-4 py-3 text-left">Contact Email</th>
                <SortHead label="Active Providers" k="provider_count" align="center" />
                <SortHead label="Active Cases" k="active_case_count" align="center" />
                <SortHead label="Status" k="status" />
                <th className="px-4 py-3 text-left w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-500">
                    No companies match your filters.
                  </td>
                </tr>
              )}
              {visible.map((company) => (
                <tr key={company.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-cobalt-600 hover:underline"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{company.contact_person || "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{company.contact_email || "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-700">{company.provider_count}</td>
                  <td className="px-4 py-3 text-center text-ink-700">{company.active_case_count}</td>
                  <td className="px-4 py-3">
                    <Badge variant={company.status === "active" || company.status === "active_client" || company.status === "in_cycle" ? "success" : "secondary"}>
                      {(company.status ?? "prospect").replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <CompanyActions company={company} />
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
