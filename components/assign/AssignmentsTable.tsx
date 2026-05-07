"use client";

/**
 * Phase 5.3 — single Assignments index table (SA-067E).
 * Filters update the URL (server re-renders); row actions hit
 * /api/cases/[id] PATCH (reassign / unassign) and reuse PeerPickerModal.
 */
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PeerPickerModal } from "@/components/assign/PeerPickerModal";
import { Loader2 } from "lucide-react";

export interface AssignmentRow {
  id: string;
  caseRef: string;
  providerName: string;
  specialty: string | null;
  peerId: string | null;
  peerName: string | null;
  status: string;
  daysInStatus: number | null;
  dueDate: string | null;
  returnedReason: string | null;
  companyName: string | null;
  batchName: string | null;
  cadence: string | null;
}

interface InitialFilters {
  status: string[];
  peer: string;
  company: string;
  specialty: string;
  dateFrom: string;
  dateTo: string;
  cadence: string;
}

const STATUS_OPTIONS = [
  "unassigned",
  "pending_approval",
  "assigned",
  "in_progress",
  "completed",
  "returned_by_peer",
] as const;

const STATUS_LABEL: Record<string, string> = {
  unassigned: "Unassigned",
  pending_approval: "Pending approval",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  returned_by_peer: "Returned by peer",
  past_due: "Past due",
};

const STATUS_TINT: Record<string, string> = {
  unassigned: "bg-ink-100 text-ink-primary",
  pending_approval: "bg-amber-100 text-status-warning-fg",
  assigned: "bg-status-info-bg text-status-info-fg",
  in_progress: "bg-status-info-bg text-status-info-fg",
  completed: "bg-green-100 text-green-700",
  returned_by_peer: "bg-critical-100 text-status-danger-fg",
  past_due: "bg-critical-100 text-status-danger-fg",
};

export function AssignmentsTable({
  rows,
  initialFilters,
}: {
  rows: AssignmentRow[];
  initialFilters: InitialFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<InitialFilters>(initialFilters);

  const [pickerCase, setPickerCase] = useState<AssignmentRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyFilters(next: InitialFilters) {
    const sp = new URLSearchParams();
    if (next.status.length) sp.set("status", next.status.join(","));
    if (next.peer) sp.set("peer", next.peer);
    if (next.company) sp.set("company", next.company);
    if (next.specialty) sp.set("specialty", next.specialty);
    if (next.dateFrom) sp.set("dateFrom", next.dateFrom);
    if (next.dateTo) sp.set("dateTo", next.dateTo);
    if (next.cadence) sp.set("cadence", next.cadence);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  function toggleStatus(s: string) {
    const next = filters.status.includes(s)
      ? filters.status.filter((x) => x !== s)
      : [...filters.status, s];
    const updated = { ...filters, status: next };
    setFilters(updated);
    applyFilters(updated);
  }

  async function handleReassign(peerId: string) {
    if (!pickerCase) return;
    setBusyId(pickerCase.id);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${pickerCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reassign", peer_id: peerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Reassign failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reassign failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(row: AssignmentRow) {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: row.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Approve failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnassign(row: AssignmentRow) {
    if (!confirm(`Unassign case #${row.caseRef}?`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unassign" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unassign failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unassign failed");
    } finally {
      setBusyId(null);
    }
  }

  const visible = rows;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => {
            const on = filters.status.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? "border-status-info-dot bg-status-info-bg text-status-info-fg"
                    : "border-border-subtle text-ink-primary hover:border-status-info-dot"
                }`}
              >
                {STATUS_LABEL[s] ?? s}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <input
            value={filters.peer}
            onChange={(e) => setFilters({ ...filters, peer: e.target.value })}
            onBlur={() => applyFilters(filters)}
            placeholder="Peer ID"
            className="rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-sm"
          />
          <input
            value={filters.company}
            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            onBlur={() => applyFilters(filters)}
            placeholder="Company ID"
            className="rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-sm"
          />
          <input
            value={filters.specialty}
            onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
            onBlur={() => applyFilters(filters)}
            placeholder="Specialty"
            className="rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-sm"
          />
          <input
            value={filters.cadence}
            onChange={(e) => setFilters({ ...filters, cadence: e.target.value })}
            onBlur={() => applyFilters(filters)}
            placeholder="Cadence period (e.g. 2026-Q1)"
            className="rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => {
              const v = { ...filters, dateFrom: e.target.value };
              setFilters(v);
              applyFilters(v);
            }}
            className="rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => {
              const v = { ...filters, dateTo: e.target.value };
              setFilters(v);
              applyFilters(v);
            }}
            className="rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-sm"
          />
          {pending && (
            <span className="inline-flex items-center text-xs text-ink-secondary">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Updating…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-critical-200 bg-critical-50 px-3 py-2 text-xs text-status-danger-fg">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-ink-50 text-left">
            <tr className="text-eyebrow text-ink-secondary">
              <th className="px-3 py-2">Case ref</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Specialty</th>
              <th className="px-3 py-2">Peer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Days</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-sm text-ink-secondary">
                  No cases match these filters.
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id} className="border-t border-border-subtle hover:bg-ink-50/40">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/cases/${r.id}`} className="text-status-info-fg hover:underline">#{r.caseRef}</Link>
                  </td>
                  <td className="px-3 py-2">{r.providerName}</td>
                  <td className="px-3 py-2 text-ink-primary">{r.specialty ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-primary">{r.peerName ?? <span className="text-ink-tertiary">unassigned</span>}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_TINT[r.status] ?? "bg-ink-100 text-ink-primary"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-primary">{r.daysInStatus ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-primary">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-secondary">
                    {r.status === "returned_by_peer" && r.returnedReason
                      ? r.returnedReason
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1.5">
                      {r.status === "pending_approval" && (
                        <button
                          onClick={() => handleApprove(r)}
                          disabled={busyId === r.id}
                          className="rounded border border-status-success-dot bg-mint-50 px-2 py-0.5 text-xs font-medium text-status-success-fg hover:bg-mint-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {r.status !== "completed" && r.status !== "unassigned" && (
                        <button
                          onClick={() => setPickerCase(r)}
                          disabled={busyId === r.id}
                          className="rounded border border-border-subtle px-2 py-0.5 text-xs hover:border-status-info-dot hover:text-status-info-fg disabled:opacity-50"
                        >
                          Reassign
                        </button>
                      )}
                      {r.peerId && r.status !== "completed" && (
                        <button
                          onClick={() => handleUnassign(r)}
                          disabled={busyId === r.id}
                          className="rounded border border-border-subtle px-2 py-0.5 text-xs hover:border-status-danger-dot hover:text-status-danger-fg disabled:opacity-50"
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PeerPickerModal
        open={pickerCase !== null}
        onOpenChange={(o) => {
          if (!o) setPickerCase(null);
        }}
        specialty={pickerCase?.specialty ?? null}
        currentPeerId={pickerCase?.peerId ?? null}
        onPick={handleReassign}
        title="Reassign to peer"
      />
    </div>
  );
}
