"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  valid_until_old: string | null;
  valid_until_new: string | null;
  document_url: string | null;
  notes: string | null;
  performed_at: string | null;
}

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

export function PeerCredentialingLog({ peerId }: { peerId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/peers/${peerId}/credentialing-log`);
        if (!res.ok) return;
        const data = await res.json();
        setEntries(data.entries ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [peerId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5" /> Credentialing Log
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-ink-secondary">Loading...</p></CardContent>
      </Card>
    );
  }

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5" /> Credentialing Log
          <Badge variant="secondary" className="ml-2">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 rounded-md border border-border-subtle px-3 py-2">
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <div className="h-2 w-2 rounded-full bg-mint-400" />
                <div className="w-px flex-1 bg-ink-200" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-0 bg-mint-50 text-status-success-fg">
                    {entry.action}
                  </Badge>
                </div>
                <div className="text-xs text-ink-secondary">
                  {formatDate(entry.performed_at)}
                </div>
                {(entry.valid_until_old || entry.valid_until_new) && (
                  <div className="text-xs text-ink-secondary">
                    Valid until: {entry.valid_until_old ?? "none"} → {entry.valid_until_new ?? "none"}
                  </div>
                )}
                {entry.notes && (
                  <p className="text-xs text-ink-secondary">{entry.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
