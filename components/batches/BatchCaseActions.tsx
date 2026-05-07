"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PeerPickerModal } from "@/components/assign/PeerPickerModal";

interface Props {
  caseId: string;
  status: string;
  peerId: string | null;
  specialty: string | null;
}

export function BatchCaseActions({ caseId, status, peerId, specialty }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleApprove() {
    setBusy(true);
    try {
      const res = await fetch("/api/assign/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Approve failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleReassign(newPeerId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reassign", peer_id: newPeerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Reassign failed");
        return;
      }
      setPickerOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign() {
    if (!confirm("Unassign this case?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unassign" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Unassign failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "completed") return null;

  return (
    <>
      <div className="inline-flex gap-1.5">
        {status === "pending_approval" && (
          <button
            onClick={handleApprove}
            disabled={busy}
            className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {status !== "completed" && status !== "unassigned" && (
          <button
            onClick={() => setPickerOpen(true)}
            disabled={busy}
            className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
          >
            Reassign
          </button>
        )}
        {peerId && status !== "completed" && (
          <button
            onClick={handleUnassign}
            disabled={busy}
            className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:border-red-400 hover:text-red-600 disabled:opacity-50"
          >
            Unassign
          </button>
        )}
      </div>

      <PeerPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        specialty={specialty}
        currentPeerId={peerId}
        onPick={handleReassign}
        title="Reassign to peer"
      />
    </>
  );
}
