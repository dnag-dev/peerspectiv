"use client";

import { useState } from "react";

interface Action {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  dueDate: string | null;
  assignedTo: string | null;
}

function statusColor(s: string) {
  switch (s) {
    case "completed":
      return "#22C55E";
    case "in_progress":
      return "#F59E0B";
    case "open":
      return "#EF4444";
    default:
      return "#94A3B8";
  }
}

export function CorrectiveList({ actions }: { actions: Action[] }) {
  const [items, setItems] = useState(actions);
  const [saving, setSaving] = useState<string | null>(null);

  const updateProgress = async (id: string, progress: number) => {
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, progress } : a))
    );
    setSaving(id);
    try {
      await fetch(`/api/corrective/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress_pct: progress }),
      });
    } catch {
      // noop
    } finally {
      setSaving(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg p-5" style={{ backgroundColor: "#1A3050" }}>
        <p className="text-sm text-ink-400">No corrective actions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div
          key={a.id}
          className="rounded-lg p-5"
          style={{ backgroundColor: "#1A3050" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${statusColor(a.status)}22`,
                    color: statusColor(a.status),
                  }}
                >
                  {a.status}
                </span>
                {a.assignedTo && (
                  <span className="text-xs text-ink-400">→ {a.assignedTo}</span>
                )}
              </div>
              <h3 className="text-base font-semibold text-white">{a.title}</h3>
              {a.description && (
                <p className="mt-1 text-sm text-ink-400">{a.description}</p>
              )}
            </div>
            {a.dueDate && (
              <div className="text-right text-xs text-ink-400">
                Due {new Date(a.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-ink-400 mb-1">
              <span>Progress {saving === a.id && "(saving…)"}</span>
              <span>{a.progress}%</span>
            </div>
            <div
              data-testid="progress-bar"
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "#0B1829" }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${a.progress}%`,
                  backgroundColor: statusColor(a.status),
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={a.progress}
              onChange={(e) => updateProgress(a.id, parseInt(e.target.value, 10))}
              className="mt-2 w-full accent-[#2E6FE8]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
