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
  unassigned: "bg-ink-100 text-ink-700",
  pending_approval: "bg-amber-100 text-amber-700",
  assigned: "bg-cobalt-100 text-cobalt-700",
  in_progress: "bg-cobalt-100 text-cobalt-700",
  completed: "bg-green-100 text-green-700",
  returned_by_peer: "bg-critical-100 text-critical-700",
  past_due: "bg-critical-100 text-critical-700",
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
      <div className="space-y-3 rounded-lg border border-ink-200 bg-paper-surface p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => {
            const on = filters.status.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? "border-cobalt-600 bg-cobalt-100 text-cobalt-700"
                    : "border-ink-200 text-ink-700 hover:border-cobalt-600"
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
            className="rounded-md border border-ink-200 bg-paper-surface px-3 py-1.5 text-sm"
          />
          <input
            value={filters.company}
            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            onBlur={() => applyFilters(filters)}
            placeholder="Company ID"
            className="rounded-md border border-ink-200 bg-paper-surface px-3 py-1.5 text-sm"
          />
          <input
            value={filters.specialty}
            onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
            onBlur={() => applyFilters(filters)}
            placeholder="Specialty"
            className="rounded-md border border-ink-200 bg-paper-surface px-3 py-1.5 text-sm"
          />
          <input
            value={filters.cadence}
            onChange={(e) => setFilters({ ...filters, cadence: e.target.value })}
            onBlur={() => applyFilters(filters)}
            placeholder="Cadence period (e.g. 2026-Q1)"
            className="rounded-md border border-ink-200 bg-paper-surface px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => {
              const v = { ...filters, dateFrom: e.target.value };
              setFilters(v);
              applyFilters(v);
            }}
            className="rounded-md border border-ink-200 bg-paper-surface px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => {
              const v = { ...filters, dateTo: e.target.value };
              setFilters(v);
              applyFilters(v);
            }}
            className="rounded-md border border-ink-200 bg-paper-surface px-3 py-1.5 text-sm"
          />
          {pending && (
            <span className="inline-flex items-center text-xs text-ink-500">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Updating…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-critical-200 bg-critical-50 px-3 py-2 text-xs text-critical-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-ink-200 bg-paper-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left">
            <tr className="text-eyebrow text-ink-500">
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
                <td colSpan={9} className="px-3 py-12 text-center text-sm text-ink-500">
                  No cases match these filters.
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                  <td className="px-3 py-2 font-mono text-xs text-ink-700">#{r.caseRef}</td>
                  <td className="px-3 py-2">{r.providerName}</td>
                  <td className="px-3 py-2 text-ink-700">{r.specialty ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-700">{r.peerName ?? <span className="text-ink-400">unassigned</span>}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_TINT[r.status] ?? "bg-ink-100 text-ink-700"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-700">{r.daysInStatus ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-700">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-500">
                    {r.status === "returned_by_peer" && r.returnedReason
                      ? r.returnedReason
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1.5">
                      <Link
                        href={`/cases/${r.id}`}
                        className="rounded border border-ink-200 px-2 py-0.5 text-xs hover:border-cobalt-600 hover:text-cobalt-700"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setPickerCase(r)}
                        disabled={busyId === r.id}
                        className="rounded border border-ink-200 px-2 py-0.5 text-xs hover:border-cobalt-600 hover:text-cobalt-700 disabled:opacity-50"
                      >
                        Reassign
                      </button>
                      {r.peerId && (
                        <button
                          onClick={() => handleUnassign(r)}
                          disabled={busyId === r.id}
                          className="rounded border border-ink-200 px-2 py-0.5 text-xs hover:border-critical-600 hover:text-critical-700 disabled:opacity-50"
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
