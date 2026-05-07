"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Ban, RotateCcw, Archive } from "lucide-react";

const STATE_LABELS: Record<string, string> = {
  invited: "Invited",
  pending_admin_review: "Pending Admin Review",
  pending_credentialing: "Pending Credentialing",
  active: "Active",
  license_expired: "License Expired",
  suspended: "Suspended",
  archived: "Archived",
};

const STATE_COLORS: Record<string, string> = {
  invited: "bg-blue-100 text-blue-700",
  pending_admin_review: "bg-amber-100 text-status-warning-fg",
  pending_credentialing: "bg-amber-100 text-status-warning-fg",
  active: "bg-mint-100 text-status-success-fg",
  license_expired: "bg-critical-100 text-status-danger-fg",
  suspended: "bg-red-100 text-red-700",
  archived: "bg-ink-100 text-ink-secondary",
};

interface Props {
  peerId: string;
  currentState: string;
  peerName: string;
}

type TransitionAction = {
  toState: string;
  label: string;
  icon: React.ReactNode;
  variant: "outline" | "destructive";
  requiresReason: boolean;
};

function getAvailableActions(state: string): TransitionAction[] {
  const actions: TransitionAction[] = [];
  if (state === "active") {
    actions.push({
      toState: "suspended",
      label: "Suspend",
      icon: <Ban className="h-4 w-4 mr-1" />,
      variant: "destructive",
      requiresReason: true,
    });
  }
  if (state === "suspended") {
    actions.push({
      toState: "active",
      label: "Reinstate",
      icon: <RotateCcw className="h-4 w-4 mr-1" />,
      variant: "outline",
      requiresReason: true,
    });
  }
  if (state !== "archived") {
    actions.push({
      toState: "archived",
      label: "Archive",
      icon: <Archive className="h-4 w-4 mr-1" />,
      variant: "destructive",
      requiresReason: true,
    });
  }
  return actions;
}

export function PeerStateActions({ peerId, currentState, peerName }: Props) {
  const router = useRouter();
  const [dialogAction, setDialogAction] = useState<TransitionAction | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = getAvailableActions(currentState);

  async function handleConfirm() {
    if (!dialogAction) return;
    if (dialogAction.requiresReason && !reason.trim()) {
      setError("Reason is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/peers/${peerId}/state-transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toState: dialogAction.toState, reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Transition failed");
      setDialogAction(null);
      setReason("");
      window.dispatchEvent(new Event("peer-status-changed"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`border-0 ${STATE_COLORS[currentState] ?? "bg-ink-100 text-ink-secondary"}`}>
          {STATE_LABELS[currentState] ?? currentState}
        </Badge>
        {actions.map((a) => (
          <Button
            key={a.toState}
            variant={a.variant}
            size="sm"
            onClick={() => { setDialogAction(a); setReason(""); setError(null); }}
          >
            {a.icon}
            {a.label}
          </Button>
        ))}
      </div>

      <Dialog open={!!dialogAction} onOpenChange={(o) => { if (!o) setDialogAction(null); }}>
        <DialogContent className="bg-white border border-border-subtle shadow-2xl rounded-xl sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {dialogAction?.label} {peerName}
            </DialogTitle>
            <DialogDescription>
              This will transition the peer from <strong>{STATE_LABELS[currentState]}</strong> to{" "}
              <strong>{STATE_LABELS[dialogAction?.toState ?? ""]}</strong>.
              {dialogAction?.toState === "archived" && " This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for this change (required)..."
              rows={3}
            />
            {error && <p className="text-sm text-status-danger-dot">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={dialogAction?.variant ?? "outline"}
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {dialogAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
