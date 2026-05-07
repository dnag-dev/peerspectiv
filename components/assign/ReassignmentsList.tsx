"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowUpDown, X } from "lucide-react";
import { PeerPickerModal } from "@/components/assign/PeerPickerModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ReassignmentRow {
  id: string;
  caseId: string;
  peerId: string | null;
  reason: string;
  createdAt: string | null;
  specialty: string | null;
  peerName: string | null;
  providerName: string | null;
  companyName: string | null;
}

interface Props {
  rows: ReassignmentRow[];
}

export function ReassignmentsList({ rows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const [dismissOpen, setDismissOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [dismissNote, setDismissNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentPickerRow = pickerOpen ? rows.find((r) => r.id === pickerOpen) : null;
  const currentDismissRow = dismissOpen ? rows.find((r) => r.id === dismissOpen) : null;

  function markBusy(id: string, on: boolean) {
    setBusy((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  async function handlePick(requestId: string, newPeerId: string) {
    markBusy(requestId, true);
    setError(null);
    try {
      const res = await fetch(`/api/reassignments/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", new_peer_id: newPeerId }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      markBusy(requestId, false);
    }
  }

  async function handleDismiss(requestId: string) {
    markBusy(requestId, true);
    setError(null);
    try {
      const res = await fetch(`/api/reassignments/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "dismissed",
          resolution_note: dismissNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to dismiss");
      setDismissOpen(null);
      setDismissNote("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      markBusy(requestId, false);
    }
  }

  return (
    <>
      {error && (
        <div className="rounded-md border border-critical-200 bg-critical-50 px-3 py-2 text-sm text-status-danger-fg">
          {error}
        </div>
      )}
      <div className="space-y-3">
        {rows.map((r) => {
          const isBusy = busy.has(r.id) || isPending;
          const created = r.createdAt
            ? new Date(r.createdAt).toLocaleString()
            : "—";
          return (
            <article
              key={r.id}
              className="rounded-lg border border-border-subtle bg-surface-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-mono text-[11px] text-ink-secondary">
                      #{r.caseId.slice(0, 8)}
                    </span>
                    <span className="font-medium text-ink-primary">
                      {r.providerName ?? "Unknown provider"}
                    </span>
                    {r.specialty && (
                      <span className="rounded-full border border-status-success-fg/30 bg-mint-50 px-2 py-0.5 text-[11px] font-medium text-status-success-fg">
                        {r.specialty}
                      </span>
                    )}
                    {r.companyName && (
                      <span className="text-ink-secondary">· {r.companyName}</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-secondary">
                    Peer:{" "}
                    <span className="font-medium text-ink-800">
                      {r.peerName ?? "Unknown"}
                    </span>
                    <span className="ml-3 text-ink-tertiary">Requested {created}</span>
                  </div>
                  <div className="mt-2 rounded-md border-l-2 border-status-info-fg/40 bg-brand/5 px-3 py-2 text-sm text-ink-800">
                    {r.reason}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(r.id)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-status-info-fg bg-surface-card px-3 py-1.5 text-xs font-medium text-status-info-fg transition-colors hover:bg-status-info-bg disabled:opacity-50"
                  >
                    {busy.has(r.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                    Pick new peer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDismissOpen(r.id);
                      setDismissNote("");
                    }}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:border-border-default disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                    Dismiss
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {currentPickerRow && (
        <PeerPickerModal
          open={!!pickerOpen}
          onOpenChange={(o) => setPickerOpen(o ? pickerOpen : null)}
          specialty={currentPickerRow.specialty}
          currentPeerId={currentPickerRow.peerId ?? null}
          onPick={(newPeerId) =>
            handlePick(currentPickerRow.id, newPeerId)
          }
          title="Reassign to new peer"
        />
      )}

      <Dialog
        open={!!dismissOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDismissOpen(null);
            setDismissNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss reassignment request</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Optional note explaining why you&apos;re dismissing this request.
            </p>
          </DialogHeader>
          <textarea
            value={dismissNote}
            onChange={(e) => setDismissNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm focus:border-status-info-dot focus:outline-none"
            placeholder="e.g. Followed up with peer; they'll keep the case."
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDismissOpen(null);
                setDismissNote("");
              }}
              disabled={dismissOpen ? busy.has(dismissOpen) : false}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => currentDismissRow && handleDismiss(currentDismissRow.id)}
              disabled={dismissOpen ? busy.has(dismissOpen) : false}
            >
              {dismissOpen && busy.has(dismissOpen) && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Dismiss request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
