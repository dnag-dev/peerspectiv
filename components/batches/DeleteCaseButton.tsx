"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  caseId: string;
  chartFileName: string | null;
  isCompleted: boolean;
}

export function DeleteCaseButton({ caseId, chartFileName, isCompleted }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const label = chartFileName || `case ${caseId.slice(0, 8)}`;
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Delete failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (isCompleted) return null;

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={busy}
        title="Delete chart"
        className="rounded border border-border-subtle p-1 text-muted-foreground hover:border-red-400 hover:text-red-600 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
      {error && (
        <span className="text-[10px] text-red-500">{error}</span>
      )}
    </>
  );
}
