"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, User, CheckCircle2, AlertCircle } from "lucide-react";

export interface PickerPeer {
  id: string;
  full_name: string;
  specialty: string | null;
  board_certification: string | null;
  active_cases_count: number | null;
  total_reviews_completed: number | null;
  availability_status: string | null;
  unavailable_until: string | null;
  unavailable_reason: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialty: string | null;
  currentPeerId?: string | null;
  onPick: (peerId: string) => void | Promise<void>;
  title?: string;
}

export function PeerPickerModal({
  open,
  onOpenChange,
  specialty,
  currentPeerId,
  onPick,
  title = "Pick a peer",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [peers, setPeers] = useState<PickerPeer[]>([]);
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const qs = specialty ? `?specialty=${encodeURIComponent(specialty)}` : "";
    fetch(`/api/peers/available${qs}`)
      .then((r) => r.json())
      .then((d) => setPeers(d.peers ?? []))
      .catch(() => setPeers([]))
      .finally(() => setLoading(false));
  }, [open, specialty]);

  async function handlePick(id: string) {
    setPickingId(id);
    try {
      await onPick(id);
      onOpenChange(false);
    } finally {
      setPickingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {specialty && (
            <p className="text-xs text-muted-foreground">
              Filtered to <span className="font-medium">{specialty}</span> —
              sorted by least-loaded first.
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading peers...
          </div>
        ) : peers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground/50" />
            No peers available for this specialty.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {peers.map((r) => {
              const isCurrent = r.id === currentPeerId;
              const isUnavailable = r.availability_status !== "available";
              const isPicking = pickingId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handlePick(r.id)}
                  disabled={isUnavailable || isPicking || isCurrent}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                    isCurrent
                      ? "border-cobalt-600 bg-cobalt-100"
                      : isUnavailable
                        ? "cursor-not-allowed border-ink-200 bg-ink-50 opacity-50"
                        : "border-ink-200 hover:border-cobalt-600 hover:bg-cobalt-100/50"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt-100">
                    <User className="h-4 w-4 text-cobalt-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {r.full_name}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-cobalt-100 px-1.5 py-0.5 text-[10px] font-medium text-cobalt-600">
                          CURRENT
                        </span>
                      )}
                      {isUnavailable && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          UNAVAILABLE
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.specialty ?? "—"}
                      {r.board_certification ? ` · ${r.board_certification}` : ""}
                      {" · "}
                      {r.active_cases_count ?? 0} active ·{" "}
                      {r.total_reviews_completed ?? 0} total
                      {isUnavailable && r.unavailable_reason
                        ? ` · ${r.unavailable_reason}`
                        : ""}
                    </div>
                  </div>
                  {isPicking ? (
                    <Loader2 className="h-4 w-4 animate-spin text-cobalt-600" />
                  ) : (
                    !isUnavailable &&
                    !isCurrent && (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground/40" />
                    )
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
