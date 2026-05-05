"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface AuditEntry {
  id: string;
  from_state: string | null;
  to_state: string;
  changed_by: string | null;
  change_reason: string | null;
  changed_at: string | null;
}

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
  invited: "bg-blue-50 text-blue-700",
  pending_admin_review: "bg-amber-50 text-amber-700",
  pending_credentialing: "bg-amber-50 text-amber-700",
  active: "bg-mint-50 text-mint-700",
  license_expired: "bg-critical-50 text-critical-700",
  suspended: "bg-red-50 text-red-700",
  archived: "bg-ink-50 text-ink-600",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PeerStateHistory({ peerId }: { peerId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/peers/${peerId}/state-audit`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setEntries(data.entries ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // Re-fetch when a state transition happens (custom event from PeerStateActions)
    function onTransition() { load(); }
    window.addEventListener("peer-state-changed", onTransition);
    return () => { cancelled = true; window.removeEventListener("peer-state-changed", onTransition); };
  }, [peerId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" /> State History
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-ink-500">Loading...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5" /> State History
          <Badge variant="secondary" className="ml-2">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No state transitions recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-md border border-ink-100 px-3 py-2">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <div className="h-2 w-2 rounded-full bg-cobalt-400" />
                  <div className="w-px flex-1 bg-ink-200" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.from_state && (
                      <>
                        <Badge variant="outline" className={`text-xs border-0 ${STATE_COLORS[entry.from_state] ?? ""}`}>
                          {STATE_LABELS[entry.from_state] ?? entry.from_state}
                        </Badge>
                        <span className="text-xs text-ink-400">&rarr;</span>
                      </>
                    )}
                    <Badge variant="outline" className={`text-xs border-0 ${STATE_COLORS[entry.to_state] ?? ""}`}>
                      {STATE_LABELS[entry.to_state] ?? entry.to_state}
                    </Badge>
                  </div>
                  <div className="text-xs text-ink-500">
                    {formatDate(entry.changed_at)}
                    {entry.changed_by && <span> by {entry.changed_by}</span>}
                  </div>
                  {entry.change_reason && (
                    <p className="text-xs text-ink-600">{entry.change_reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
