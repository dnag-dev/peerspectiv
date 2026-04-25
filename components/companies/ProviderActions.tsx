"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Archive } from "lucide-react";

interface ProviderActionsProps {
  providerId: string;
  providerName: string;
  status: string;
}

export function ProviderActions({ providerId, providerName, status }: ProviderActionsProps) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function handleArchive() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error("Failed to archive provider");
      setArchiveOpen(false);
      router.refresh();
    } catch {
      // Error handled silently
    } finally {
      setArchiving(false);
    }
  }

  if (status !== "active") return null;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setArchiveOpen(true)} title="Archive provider">
        <Archive className="h-4 w-4 text-muted-foreground" />
      </Button>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border border-ink-200 shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Archive Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive <strong>{providerName}</strong>? They will no longer appear in active
              provider lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              {archiving ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
