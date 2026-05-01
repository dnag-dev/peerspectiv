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
  allowNa?: boolean;
  defaultValue?: "yes" | "no" | "na" | null;
  requiredTextOnNonDefault?: boolean;
  opsTerm?: string | null;
}

interface AiPrefill {
  value: unknown;
  confidence: "high" | "medium" | "low";
  reasoning?: string;
  pageReference?: string;
}

interface ExistingResult {
  submittedAt: string | Date | null;
  // numeric(5,2) — drizzle returns string from postgres; consumers Number() it.
  overallScore: number | string | null;
  narrativeFinal: string | null;
}

interface ReviewerLicense {
  fullName: string | null;
  credential?: string | null;
  licenseNumber: string | null;
  licenseState: string | null;
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
  reviewerLicense?: ReviewerLicense;
  initialMrnNumber?: string | null;
  allowAiNarrative?: boolean;
  /** Section F5: extracted chart text used to estimate the page a hovered
   *  question maps to so the iframe can be scrolled to roughly that page. */
  chartTextExtracted?: string | null;
}

// Section F5: keyword map keyed off form field_key / field_label substrings.
// Lowercased substring match.
const F5_KEYWORD_MAP: Record<string, RegExp> = {
  "mental status": /mental status/i,
  "allergies": /allergies?/i,
  "medication list": /medication/i,
  "medications": /medication/i,
  "vital signs": /vital signs|\bBP\b|blood pressure/i,
  "ros": /review of systems|\bROS\b/i,
  "review of systems": /review of systems|\bROS\b/i,
};

function findChartPageForField(
  fieldKey: string,
  fieldLabel: string,
  chartText: string | null | undefined
): number | null {
  if (!chartText) return null;
  const haystackKeys = [fieldKey.toLowerCase(), fieldLabel.toLowerCase()];
  let pattern: RegExp | null = null;
  for (const k of Object.keys(F5_KEYWORD_MAP)) {
    if (haystackKeys.some((h) => h.includes(k))) {
      pattern = F5_KEYWORD_MAP[k];
      break;
    }
  }
  if (!pattern) return null;
  const lines = chartText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      // ~50 lines per page heuristic per spec.
      return Math.floor(i / 50) + 1;
    }
  }
  return null;
}

type LeftTab = "ash" | "chart";

// Pulse-light risk-flag tints. amber-200 / critical-200 don't exist as
// tokens in the current Tailwind config — falling back to -100 borders.
const SEV_META = {
  high:   { dot: "bg-critical-600", text: "text-critical-700", bg: "bg-critical-50", border: "border-critical-100", label: "HIGH" },
  medium: { dot: "bg-amber-600",    text: "text-amber-700",    bg: "bg-amber-50",    border: "border-amber-100",    label: "MED"  },
  low:    { dot: "bg-cobalt-600",   text: "text-cobalt-700",   bg: "bg-cobalt-50",   border: "border-cobalt-100",   label: "LOW"  },
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
  reviewerLicense,
  initialMrnNumber,
  allowAiNarrative,
  chartTextExtracted,
}: Props) {
  const [tab, setTab] = useState<LeftTab>("ash");
  // Section F5: track the iframe's `#page=N` fragment so hover events update
  // the URL. Initial value is the bare chartViewUrl.
  const [chartFrameUrl, setChartFrameUrl] = useState<string | null>(
    chartViewUrl
  );
  useEffect(() => {
    setChartFrameUrl(chartViewUrl);
  }, [chartViewUrl]);

  function handleFieldHover(fieldKey: string, fieldLabel: string) {
    if (!chartViewUrl) return;
    const page = findChartPageForField(fieldKey, fieldLabel, chartTextExtracted);
    if (!page) return; // no match — silently no-op
    // Strip any existing #page= fragment, then append the new one.
    const base = chartViewUrl.split("#")[0];
    const next = `${base}#page=${page}`;
    setChartFrameUrl((prev) => (prev === next ? prev : next));
    // If the user is on the Ash Summary tab, swing them to the chart.
    setTab((t) => (t === "chart" ? t : "chart"));
  }
  const [savedLayout, setSavedLayout] = useState<{ left: number; right: number } | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

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
          ? "border-cobalt-700 text-cobalt-700"
          : "border-transparent text-ink-500 hover:text-ink-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-0 flex-1 bg-paper-canvas">
      <PanelGroup
        key={layoutReady ? "hydrated" : "default"}
        orientation="horizontal"
        className="flex h-full"
        onLayoutChanged={persistLayout}
      >
        {/* ─── LEFT PANEL: tabbed (Ash Summary / Chart) ─── */}
        <Panel id="left-panel" defaultSize={defaultLeft} minSize={30} maxSize={70}>
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-200 bg-paper-surface">
            {/* Tab bar */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-200">
              <div className="flex">
                <TabBtn
                  id="ash"
                  icon={<Sparkles className={`h-4 w-4 ${tab === "ash" ? "text-cobalt-700" : ""}`} />}
                  label="Ash Summary"
                />
                <TabBtn id="chart" icon={<FileText className="h-4 w-4" />} label="Medical Chart" />
              </div>
              {tab === "chart" && chartViewUrl && (
                <a
                  href={chartViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-3 flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-50"
                >
                  <ExternalLink className="h-3 w-3" /> Open fullscreen
                </a>
              )}
            </div>

            {/* Ash Summary tab */}
            {tab === "ash" && (
              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                <section>
                  <h3 className="mb-2 text-eyebrow text-ink-500">
                    Chart Summary
                  </h3>
                  {chartSummary ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                      {chartSummary}
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed italic text-ink-500">
                      AI analysis pending…
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="mb-3 text-eyebrow text-ink-500">
                    Risk Flags
                    {riskFlags.length > 0 && (
                      <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-mono font-medium text-ink-600">
                        {riskFlags.length}
                      </span>
                    )}
                  </h3>
                  {riskFlags.length === 0 ? (
                    <p className="text-xs text-ink-400">No risk flags identified.</p>
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
                                <span className="text-sm font-medium text-ink-900">
                                  {flag.label}
                                </span>
                              </div>
                              {flag.description && (
                                <p className="mt-1 text-xs leading-relaxed text-ink-600">
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
              <div className="flex flex-1 flex-col p-3">
                {chartFileName && (
                  <div className="flex-shrink-0 border-b border-ink-200 px-1 pb-2 text-xs text-ink-500">
                    {chartFileName}
                  </div>
                )}
                {chartViewUrl ? (
                  <div className="mt-2 flex-1 overflow-hidden rounded-lg border border-ink-200">
                    <iframe
                      key={chartFrameUrl ?? chartViewUrl}
                      src={chartFrameUrl ?? chartViewUrl}
                      title="Medical Chart"
                      className="h-full w-full border-0 bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-ink-400">
                    No chart file — upload from admin batch page
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* Drag handle */}
        <PanelResizeHandle className="group mx-2 flex w-1.5 cursor-col-resize items-center justify-center">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-ink-50 transition-colors group-hover:bg-cobalt-200 group-data-[resize-handle-state=drag]:bg-cobalt-400">
            <GripVertical className="h-4 w-4 text-ink-300 group-hover:text-ink-500" />
          </div>
        </PanelResizeHandle>

        {/* ─── RIGHT PANEL: Review form ─── */}
        <Panel id="right-panel" defaultSize={defaultRight} minSize={30} maxSize={70}>
          <div className="h-full overflow-y-auto rounded-xl">
            {existingResult ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-mint-200 bg-mint-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mint-100">
                    <svg className="h-6 w-6 text-mint-700" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h2 className="text-h2 text-ink-900">Review Submitted</h2>
                  <p className="mt-1 text-small text-ink-500">
                    {existingResult.submittedAt
                      ? `Submitted ${new Date(existingResult.submittedAt).toLocaleString()}`
                      : "This case has already been reviewed."}
                  </p>
                </div>
                {(existingResult.overallScore != null || existingResult.narrativeFinal) && (
                  <div className="rounded-xl border border-ink-200 bg-paper-surface p-5">
                    {existingResult.overallScore != null && (
                      <div
                        className="mb-3"
                        title="Yes/No score = (yes − no) ÷ (yes + no), N/A excluded"
                      >
                        <div className="text-eyebrow text-ink-500">Overall Score</div>
                        <div className="mt-1 text-h1 text-ink-900">
                          {existingResult.overallScore}
                          <span className="ml-1 text-small text-ink-400">/ 100</span>
                        </div>
                      </div>
                    )}
                    {existingResult.narrativeFinal && (
                      <div>
                        <div className="text-eyebrow text-ink-500">Reviewer Narrative</div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                          {existingResult.narrativeFinal}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <a href="/reviewer/portal" className="btn-secondary block text-center">
                  Back to My Queue
                </a>
              </div>
            ) : (
              <ReviewForm
                caseId={caseId}
                reviewerId={reviewerId}
                formFields={formFields}
                aiPrefills={aiPrefills}
                reviewerLicense={reviewerLicense}
                initialMrnNumber={initialMrnNumber}
                allowAiNarrative={allowAiNarrative}
                onFieldHover={chartViewUrl ? handleFieldHover : undefined}
              />
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
