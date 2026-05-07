"use client";

/**
 * Phase 5.2 — peer returns a case (PR-030, SA-067H).
 * Mirrors RequestReassignmentButton's UX (modal + reason textarea) but the
 * action is destructive: the case immediately flips to returned_by_peer and
 * the peer is unassigned. Reason min length: 10 chars (server enforces).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Undo2 } from "lucide-react";

interface Props {
  caseId: string;
}

export function ReturnCaseButton({ caseId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (reason.trim().length < 10) {
      setError("Please provide at least 10 characters explaining why.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/peer/cases/${caseId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to return case");
      }
      setOpen(false);
      // Bounce back to the inbox — the case is no longer the peer's.
      router.push("/peer/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-critical-200 bg-surface-card px-2.5 py-1 text-xs font-medium text-status-danger-fg transition-colors hover:border-status-danger-dot hover:bg-critical-50"
      >
        <Undo2 className="h-3 w-3" />
        Return case
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return this case</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Returning unassigns you from this case immediately. Admin will
              re-route it to another peer. You will not earn for this case.
            </p>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-eyebrow text-ink-secondary" htmlFor="return-reason">
              Why are you returning this case?
            </label>
            <textarea
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              minLength={10}
              className="w-full rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm focus:border-status-info-dot focus:outline-none"
              placeholder="e.g. Conflict of interest discovered after opening chart…"
            />
            {error && <p className="text-xs text-status-danger-fg">{error}</p>}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || reason.trim().length < 10}
            >
              {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Return case
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
