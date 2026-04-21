"use client";

import { useEffect, useState } from "react";

interface Insight {
  type: "positive" | "urgent" | "warning" | "info";
  title: string;
  description: string;
  recommendation?: string;
}

const BORDER_COLORS: Record<Insight["type"], string> = {
  positive: "#22C55E",
  urgent: "#EF4444",
  warning: "#F59E0B",
  info: "#2E6FE8",
};

export function QualityInsights({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId, type: "insights" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setInsights(json.insights ?? []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? "Failed to load insights");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg p-5 animate-pulse"
            style={{ backgroundColor: "#1A3050" }}
          >
            <div className="h-4 w-1/2 rounded mb-3" style={{ backgroundColor: "#2A3F5F" }} />
            <div className="h-3 w-full rounded mb-2" style={{ backgroundColor: "#2A3F5F" }} />
            <div className="h-3 w-4/5 rounded" style={{ backgroundColor: "#2A3F5F" }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-5 border-l-[4px]"
        style={{ backgroundColor: "#1A3050", borderLeftColor: "#EF4444" }}
      >
        <div className="text-sm font-semibold text-white">Failed to load insights</div>
        <div className="text-xs text-gray-400 mt-1">{error}</div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="rounded-lg p-5" style={{ backgroundColor: "#1A3050" }}>
        <p className="text-sm text-gray-400">
          No insights available for {companyName} yet. Complete reviews to generate insights.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((insight, i) => (
        <div
          key={i}
          data-testid="ai-insight"
          className="rounded-lg p-5 border-l-[4px]"
          style={{
            backgroundColor: "#1A3050",
            borderLeftColor: BORDER_COLORS[insight.type] ?? "#2E6FE8",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${BORDER_COLORS[insight.type]}22`,
                color: BORDER_COLORS[insight.type],
              }}
            >
              {insight.type}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
          <p className="mt-2 text-sm text-gray-300">{insight.description}</p>
          {insight.recommendation && (
            <p className="mt-3 text-xs text-gray-400 italic">
              Recommendation: {insight.recommendation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
