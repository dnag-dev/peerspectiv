"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";

interface BatchActionsProps {
  batchId: string;
  hasUnassigned: boolean;
  hasPendingApproval?: boolean;
}

export function BatchActions({ batchId, hasUnassigned, hasPendingApproval }: BatchActionsProps) {
  const router = useRouter();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRunAI() {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/assign/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_id: batchId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "AI assignment failed");
      }

      const data = await res.json();
      setResult({ summary: data.summary || "Assignment suggestions generated." });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {hasPendingApproval && (
          <Link href="/assign">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              View AI Queue
            </Button>
          </Link>
        )}
        <Button
          onClick={() => setAiDialogOpen(true)}
          disabled={!hasUnassigned}
          title={hasUnassigned ? "Run AI assignment suggestions" : "All cases already assigned or pending approval"}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Run AI Assignment
        </Button>
      </div>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="bg-white border border-border-subtle shadow-2xl rounded-xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>AI-Powered Assignment</DialogTitle>
            <DialogDescription>
              The AI will analyze unassigned cases in this batch and suggest optimal peer matches
              based on specialty, workload, and past performance.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="rounded-lg border border-status-success-fg/30 bg-mint-50 p-4">
              <p className="text-sm font-medium text-status-info-fg">Assignment Complete</p>
              <p className="mt-1 text-sm text-status-info-fg">{result.summary}</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-status-danger-dot bg-critical-100 p-4">
              <p className="text-sm font-medium text-status-danger-fg">Error</p>
              <p className="mt-1 text-sm text-status-danger-fg">{error}</p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              {result ? "Done" : "Cancel"}
            </Button>
            {result && (
              <Link href="/assign">
                <Button>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Review & Approve
                </Button>
              </Link>
            )}
            {!result && (
              <Button onClick={handleRunAI} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Run Assignment
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
