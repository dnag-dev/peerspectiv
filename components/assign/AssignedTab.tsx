"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowUpDown, Inbox, Search } from "lucide-react";
import { ReviewerPickerModal } from "@/components/assign/PeerPickerModal";

export interface AssignedRow {
  id: string;
  status: string;
  due_date: string | null;
  specialty_required: string | null;
  batch_id: string | null;
  batch_name: string | null;
  provider: { id: string; first_name: string | null; last_name: string | null; specialty: string | null } | null;
  peer: { id: string; full_name: string | null } | null;
  company: { id: string; name: string | null } | null;
}

interface Props {
  rows: AssignedRow[];
  companies: { id: string; name: string }[];
  peers: { id: string; full_name: string }[];
  specialties: string[];
}

export function AssignedTab({ rows, companies, peers, specialties }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState<string>("");
  const [peerId, setReviewerId] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (companyId && r.company?.id !== companyId) return false;
      if (peerId && r.peer?.id !== peerId) return false;
      if (specialty && (r.specialty_required ?? r.provider?.specialty) !== specialty) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q) {
        const blob = [
          r.provider?.first_name,
          r.provider?.last_name,
          r.peer?.full_name,
          r.company?.name,
          r.batch_name,
          r.specialty_required,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, companyId, peerId, specialty, statusFilter, search]);

  async function handleReassign(caseId: string, newReviewerId: string) {
    setReassigning((p) => new Set(p).add(caseId));
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, reassign_to: newReviewerId }),
      });
      if (!res.ok) throw new Error("Reassign failed");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Reassign failed:", err);
    } finally {
      setReassigning((p) => {
        const n = new Set(p);
        n.delete(caseId);
        return n;
      });
    }
  }

  const currentPickerCase = pickerOpen ? rows.find((r) => r.id === pickerOpen) : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-200 bg-paper-surface px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search provider, reviewer, batch…"
            className="w-full rounded-md border border-ink-200 bg-paper-surface py-1.5 pl-8 pr-3 text-sm placeholder:text-ink-400 focus:border-cobalt-600 focus:outline-none"
          />
        </div>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded-md border border-ink-200 bg-paper-surface py-1.5 px-2 text-sm focus:border-cobalt-600 focus:outline-none"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={peerId}
          onChange={(e) => setReviewerId(e.target.value)}
          className="rounded-md border border-ink-200 bg-paper-surface py-1.5 px-2 text-sm focus:border-cobalt-600 focus:outline-none"
        >
          <option value="">All reviewers</option>
          {peers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-md border border-ink-200 bg-paper-surface py-1.5 px-2 text-sm focus:border-cobalt-600 focus:outline-none"
        >
          <option value="">All specialties</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-ink-200 bg-paper-surface py-1.5 px-2 text-sm focus:border-cobalt-600 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-ink-200 bg-paper-surface py-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-ink-400" />
          <h3 className="text-h3 text-ink-900">No assigned cases match</h3>
          <p className="mt-1 max-w-sm text-small text-ink-500">
            Adjust the filters above or check back when new assignments are approved.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink-200 bg-paper-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-eyebrow text-ink-500">
              <tr>
                <Th>Provider</Th>
                <Th>Reviewer</Th>
                <Th>Specialty</Th>
                <Th>Status</Th>
                <Th>Due date</Th>
                <Th>Batch</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((r) => {
                const isReassigning = reassigning.has(r.id);
                const provName =
                  `${r.provider?.first_name ?? ""} ${r.provider?.last_name ?? ""}`.trim() ||
                  "Unknown";
                const specLabel = r.specialty_required ?? r.provider?.specialty ?? "—";
                const due = r.due_date
                  ? new Date(r.due_date).toLocaleDateString()
                  : "—";
                return (
                  <tr key={r.id} className="hover:bg-cobalt-50/30">
                    <Td>
                      <div className="font-medium text-ink-900">{provName}</div>
                      {r.company?.name && (
                        <div className="text-[11px] text-ink-500">{r.company.name}</div>
                      )}
                    </Td>
                    <Td>{r.peer?.full_name ?? "—"}</Td>
                    <Td>{specLabel}</Td>
                    <Td>
                      <StatusPill status={r.status} />
                    </Td>
                    <Td>{due}</Td>
                    <Td>
                      {r.batch_id ? (
                        <Link
                          href={`/batches/${r.batch_id}`}
                          className="text-cobalt-700 hover:underline"
                        >
                          {r.batch_name ?? r.batch_id.slice(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setPickerOpen(r.id)}
                        disabled={isReassigning || isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-cobalt-600 hover:text-cobalt-700 disabled:opacity-50"
                      >
                        {isReassigning ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                        Reassign
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Picker modal */}
      {currentPickerCase && (
        <ReviewerPickerModal
          open={!!pickerOpen}
          onOpenChange={(o) => setPickerOpen(o ? pickerOpen : null)}
          specialty={
            currentPickerCase.specialty_required ??
            currentPickerCase.provider?.specialty ??
            null
          }
          currentReviewerId={currentPickerCase.peer?.id ?? null}
          onPick={(newReviewerId) => handleReassign(currentPickerCase.id, newReviewerId)}
          title="Reassign reviewer"
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle text-ink-800 ${className}`}>{children}</td>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    assigned: { bg: "bg-cobalt-100", text: "text-cobalt-700", label: "Assigned" },
    in_progress: { bg: "bg-mint-100", text: "text-mint-700", label: "In progress" },
  };
  const c = map[status] ?? { bg: "bg-ink-100", text: "text-ink-700", label: status };
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wider uppercase ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}
