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
import { EditCompanyDialog } from "./EditCompanyDialog";
import { Pencil, Archive } from "lucide-react";
import type { Company } from "@/types";

interface CompanyActionsProps {
  company: Company;
}

export function CompanyActions({ company }: CompanyActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  async function handleArchive() {
    setArchiving(true);
    setArchiveError(null);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) {
        let msg = "Failed to archive company.";
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch { /* non-json */ }
        setArchiveError(msg);
        return;
      }
      setArchiveOpen(false);
      router.refresh();
    } catch (e: any) {
      setArchiveError(e?.message ?? "Failed to archive company.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} title="Edit company">
          <Pencil className="h-4 w-4" />
        </Button>
        {company.status === "active" && (
          <Button variant="ghost" size="sm" onClick={() => setArchiveOpen(true)} title="Archive company">
            <Archive className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      <EditCompanyDialog company={company} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={archiveOpen} onOpenChange={(o) => { setArchiveOpen(o); if (!o) setArchiveError(null); }}>
        <DialogContent className="bg-white border border-ink-200 shadow-2xl rounded-xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Archive Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive <strong>{company.name}</strong>? This will hide the company from the
              active list. You can restore it later.
            </DialogDescription>
          </DialogHeader>
          {archiveError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {archiveError}
            </div>
          )}
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
