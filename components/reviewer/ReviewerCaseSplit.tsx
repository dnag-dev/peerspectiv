"use client";

import { useEffect, useState } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";

const STORAGE_KEY = "peerspectiv.reviewer.caseSplitLayout";
import { FileText, Sparkles, ExternalLink, GripVertical } from "lucide-react";
import { ReviewForm } from "@/components/reviewer/ReviewForm";

interface RiskFlag {
  label: string;
  severity: "high" | "medium" | "low";
  description?: string;
}

interface FormField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: "yes_no" | "rating" | "text";
  isRequired: boolean;
  displayOrder: number;
}

interface AiPrefill {
  value: unknown;
  confidence: "high" | "medium" | "low";
  reasoning?: string;
  pageReference?: string;
}

interface ExistingResult {
  submittedAt: string | Date | null;
  overallScore: number | null;
  narrativeFinal: string | null;
}

interface Props {
  chartViewUrl: string | null;
  chartFileName: string | null;
  chartSummary: string | null;
  riskFlags: RiskFlag[];
  caseId: string;
  reviewerId: string;
  formFields: FormField[];
  aiPrefills: Record<string, AiPrefill>;
  existingResult: ExistingResult | null;
}

type LeftTab = "ash" | "chart";

const SEV_META = {
  high: { dot: "bg-critical-600", text: "text-critical-600", bg: "bg-critical-600/10", border: "border-critical-600/30", label: "HIGH" },
  medium: { dot: "bg-warning-600", text: "text-warning-600", bg: "bg-warning-600/10", border: "border-warning-600/30", label: "MED" },
  low: { dot: "bg-info-600", text: "text-info-600", bg: "bg-info-600/10", border: "border-info-600/30", label: "LOW" },
};

export function ReviewerCaseSplit({
  chartViewUrl,
  chartFileName,
  chartSummary,
  riskFlags,
  caseId,
  reviewerId,
  formFields,
  aiPrefills,
  existingResult,
}: Props) {
  const [tab, setTab] = useState<LeftTab>("ash");
  const [savedLayout, setSavedLayout] = useState<{ left: number; right: number } | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  // Hydrate saved layout after mount so SSR markup stays stable
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { left?: number; right?: number };
        if (typeof parsed.left === "number" && typeof parsed.right === "number") {
          setSavedLayout({ left: parsed.left, right: parsed.right });
        }
      }
    } catch {
      // ignore corrupt value
    }
    setLayoutReady(true);
  }, []);

  function persistLayout(layout: { [id: string]: number }) {
    const left = layout["left-panel"];
    const right = layout["right-panel"];
    if (typeof left === "number" && typeof right === "number") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }));
      } catch {
        // storage quota / disabled — not critical
      }
    }
  }

  const defaultLeft = savedLayout?.left ?? 55;
  const defaultRight = savedLayout?.right ?? 45;

  const TabBtn = ({ id, icon, label }: { id: LeftTab; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        tab === id
          ? "border-[#5EEAD4] text-white"
          : "border-transparent text-white/50 hover:text-white/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-0 flex-1">
      <PanelGroup
        key={layoutReady ? "hydrated" : "default"}
        orientation="horizontal"
        className="flex h-full"
        onLayoutChanged={persistLayout}
      >
        {/* ─── LEFT PANEL: tabbed (Ash Summary / Chart) ─── */}
        <Panel id="left-panel" defaultSize={defaultLeft} minSize={30} maxSize={70}>
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0F2040]">
            {/* Tab bar */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10">
              <div className="flex">
                <TabBtn id="ash" icon={<Sparkles className="h-4 w-4" />} label="Ash Summary" />
                <TabBtn id="chart" icon={<FileText className="h-4 w-4" />} label="Medical Chart" />
              </div>
              {tab === "chart" && chartViewUrl && (
                <a
                  href={chartViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-3 flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
                >
                  <ExternalLink className="h-3 w-3" /> Open fullscreen
                </a>
              )}
            </div>

            {/* Ash Summary tab */}
            {tab === "ash" && (
              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                    Chart Summary
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {chartSummary ?? "AI analysis pending…"}
                  </p>
                </section>

                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                    Risk Flags
                    {riskFlags.length > 0 && (
                      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                        {riskFlags.length}
                      </span>
                    )}
                  </h3>
                  {riskFlags.length === 0 ? (
                    <p className="text-xs text-white/40">No risk flags identified.</p>
                  ) : (
                    <ul className="space-y-2">
                      {riskFlags.map((flag, i) => {
                        const meta = SEV_META[flag.severity];
                        return (
                          <li
                            key={i}
                            className={`flex gap-3 rounded-lg border ${meta.border} ${meta.bg} p-3`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${meta.dot}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-semibold ${meta.text}`}
                                >
                                  {meta.label}
                                </span>
                                <span className="text-sm font-medium text-white">
                                  {flag.label}
                                </span>
                              </div>
                              {flag.description && (
                                <p className="mt-1 text-xs leading-relaxed text-white/60">
                                  {flag.description}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {/* Chart tab */}
            {tab === "chart" && (
              <div className="flex flex-1 flex-col">
                {chartFileName && (
                  <div className="flex-shrink-0 border-b border-white/10 px-4 py-2 text-xs text-white/50">
                    {chartFileName}
                  </div>
                )}
                {chartViewUrl ? (
                  <iframe
                    src={chartViewUrl}
                    title="Medical Chart"
                    className="h-full w-full flex-1 border-0 bg-white"
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-white/40">
                    No chart file — upload from admin batch page
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* Drag handle */}
        <PanelResizeHandle className="group mx-2 flex w-1.5 cursor-col-resize items-center justify-center">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-[#5EEAD4]/30 group-data-[resize-handle-state=drag]:bg-[#5EEAD4]/50">
            <GripVertical className="h-4 w-4 text-white/30 group-hover:text-white/70" />
          </div>
        </PanelResizeHandle>

        {/* ─── RIGHT PANEL: Review form ─── */}
        <Panel id="right-panel" defaultSize={defaultRight} minSize={30} maxSize={70}>
          <div className="h-full overflow-y-auto rounded-xl">
            {existingResult ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-mint-500/30 bg-mint-500/5 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mint-500/20">
                    <svg className="h-6 w-6 text-mint-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Review Submitted</h2>
                  <p className="mt-1 text-xs text-white/60">
                    {existingResult.submittedAt
                      ? `Submitted ${new Date(existingResult.submittedAt).toLocaleString()}`
                      : "This case has already been reviewed."}
                  </p>
                </div>
                {(existingResult.overallScore != null || existingResult.narrativeFinal) && (
                  <div className="rounded-xl border border-white/10 bg-[#0F2040] p-5">
                    {existingResult.overallScore != null && (
                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-wide text-white/40">Overall Score</div>
                        <div className="mt-1 text-2xl font-semibold text-white">
                          {existingResult.overallScore}
                          <span className="ml-1 text-sm text-white/40">/ 100</span>
                        </div>
                      </div>
                    )}
                    {existingResult.narrativeFinal && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-white/40">Reviewer Narrative</div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                          {existingResult.narrativeFinal}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <a
                  href="/reviewer/portal"
                  className="block rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                >
                  Back to My Queue
                </a>
              </div>
            ) : (
              <ReviewForm
                caseId={caseId}
                reviewerId={reviewerId}
                formFields={formFields}
                aiPrefills={aiPrefills}
              />
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
