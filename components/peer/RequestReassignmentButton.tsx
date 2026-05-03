"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUpDown, CheckCircle2 } from "lucide-react";

interface Props {
  caseId: string;
  alreadyRequested?: boolean;
}

export function RequestReassignmentButton({ caseId, alreadyRequested = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadyRequested);

  async function handleSubmit() {
    if (reason.trim().length < 5) {
      setError("Please describe why this case needs reassignment.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reassignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to submit request");
      }
      setSubmitted(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <CheckCircle2 className="h-3 w-3" />
        Reassignment requested
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-paper-surface px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-cobalt-600 hover:text-cobalt-700"
      >
        <ArrowUpDown className="h-3 w-3" />
        Request reassignment
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request reassignment</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Tell admin why this case should be reassigned. They&apos;ll pick a new
              peer or follow up with you.
            </p>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-eyebrow text-ink-500" htmlFor="reassign-reason">
              Why does this need reassignment?
            </label>
            <textarea
              id="reassign-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              className="w-full rounded-md border border-ink-200 bg-paper-surface px-3 py-2 text-sm focus:border-cobalt-600 focus:outline-none"
              placeholder="e.g. Conflict of interest, outside my specialty, …"
            />
            {error && <p className="text-xs text-critical-700">{error}</p>}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || reason.trim().length < 5}
            >
              {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Submit request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
