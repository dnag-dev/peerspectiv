"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Download, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Company } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AssignmentRow {
  id: string;
  provider_id: string | null;
  peer_id: string | null;
  provider_name: string;
  mrn_number: string;
  is_pediatric: boolean;
  pediatric_mismatch: boolean;
  reviewer_name: string;
  encounter_date: string | null;
  overall_score: number | null;
  deficiencies_count: number;
  completed_date: string | null;
  status: string;
}

function ytdStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  companies: Pick<Company, "id" | "name">[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "in_progress":
      return "default" as const;
    case "past_due":
      return "destructive" as const;
    case "assigned":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function formatDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AssignmentResultsTab({ companies }: Props) {
  // NOTE: Radix Select disallows an empty-string value. Default to "all"
  // (matches the "All companies" SelectItem) and treat it as no-filter.
  const [companyId, setCompanyId] = useState<string>("all");
  const [providerSearch, setProviderSearch] = useState("");
  const [layout, setLayout] = useState<"portrait" | "landscape">("portrait");
  // Default to year-to-date so the tab shows data on first load instead of
  // a blank Search-first state.
  const [startDate, setStartDate] = useState(ytdStart());
  const [endDate, setEndDate] = useState(todayIso());
  const [results, setResults] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (companyId && companyId !== "all") params.set("company_id", companyId);
      if (providerSearch) params.set("provider", providerSearch);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`/api/reports/assignments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as { data: AssignmentRow[] };
      setResults(json.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, providerSearch, startDate, endDate]);

  // Auto-load YTD on first mount so the tab has data out of the gate.
  const didInitialLoad = useRef(false);
  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    fetchResults();
  }, [fetchResults]);

  const exportPdf = useCallback(async () => {
    if (results.length === 0) return;

    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: layout });
    doc.setFontSize(16);
    doc.text("Assignment Results Report", 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

    const head = [
      [
        "MRN",
        "Reviewer",
        "Encounter Date",
        "Overall Score",
        "Deficiencies",
        "Completed Date",
        "Status",
      ],
    ];
    const body = results.map((r) => [
      r.mrn_number + (r.pediatric_mismatch ? " ⚠ Pediatric" : ""),
      r.reviewer_name,
      formatDate(r.encounter_date),
      r.overall_score != null ? r.overall_score.toFixed(1) : "--",
      String(r.deficiencies_count),
      formatDate(r.completed_date),
      r.status.replace(/_/g, " "),
    ]);

    (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: 30,
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 77, 183] },
    });

    doc.save("assignment-results.pdf");
  }, [results, layout]);

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="company-filter">Company</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger id="company-filter">
              <SelectValue placeholder="All companies" />
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider-search">Provider Name</Label>
          <Input
            id="provider-search"
            placeholder="Search provider..."
            value={providerSearch}
            onChange={(e) => setProviderSearch(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <Button onClick={fetchResults} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="layout-select" className="text-xs text-muted-foreground">
                  Layout
                </Label>
                <Select
                  value={layout}
                  onValueChange={(v: string) => setLayout(v as "portrait" | "landscape")}
                >
                  <SelectTrigger id="layout-select" className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportPdf}>
                  <Download className="h-4 w-4" />
                  Export to PDF
                </Button>
              </div>
            )}
          </div>

          {results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MRN</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Encounter Date</TableHead>
                    <TableHead className="text-right">Overall Score</TableHead>
                    <TableHead className="text-right">Deficiencies</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <span>{row.mrn_number}</span>
                        {row.pediatric_mismatch && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            ⚠ Pediatric
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.peer_id ? (
                          <Link
                            href={`/reviewers/${row.peer_id}`}
                            className="text-brand-navy hover:underline"
                          >
                            {row.reviewer_name}
                          </Link>
                        ) : (
                          row.reviewer_name
                        )}
                      </TableCell>
                      <TableCell>{formatDate(row.encounter_date)}</TableCell>
                      <TableCell className="text-right">
                        {row.overall_score != null
                          ? row.overall_score.toFixed(1)
                          : "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.deficiencies_count}
                      </TableCell>
                      <TableCell>{formatDate(row.completed_date)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>
                          {row.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/cases/${row.id}`}
                          className="text-sm text-brand-navy hover:underline"
                        >
                          Open →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No assignment results match the selected filters.
            </div>
          )}
        </>
      )}
    </div>
  );
}
