"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronUp,
  Brain,
  FileText,
  AlertTriangle,
  BarChart3,
  Loader2,
} from "lucide-react";
import type { AIAnalysis, CriterionScore, Deficiency, ReviewResult } from "@/types";

interface AIAnalysisPanelProps {
  analysis: AIAnalysis;
  reviewResult?: ReviewResult | null;
  caseId: string;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? "text-status-info-dot"
      : score >= 60
        ? "text-status-warning-dot"
        : "text-status-danger-dot";

  const bgColor =
    score >= 80
      ? "bg-mint-100"
      : score >= 60
        ? "bg-amber-100"
        : "bg-critical-100";

  const strokeColor =
    score >= 80
      ? "stroke-cobalt-500"
      : score >= 60
        ? "stroke-amber-600"
        : "stroke-critical-600";

  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className="stroke-muted"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-medium ${color}`}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, string> = {
    Minor: "bg-amber-100 text-status-warning-fg",
    Moderate: "bg-amber-100 text-status-warning-fg",
    Major: "bg-critical-100 text-status-danger-fg",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${config[severity] || config.Minor}`}
    >
      {severity}
    </span>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function AIAnalysisPanel({
  analysis,
  reviewResult,
  caseId,
}: AIAnalysisPanelProps) {
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);

  async function handleTriggerAnalysis() {
    setTriggeringAnalysis(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to trigger analysis");
      window.location.reload();
    } catch (err) {
      console.error("Failed to trigger analysis:", err);
    } finally {
      setTriggeringAnalysis(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-status-info-dot" />
            AI Analysis
            <Badge variant="ai">AI</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {analysis.model_used && (
              <span>Model: {analysis.model_used}</span>
            )}
            {analysis.processing_time_ms && (
              <span>
                {(analysis.processing_time_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score gauges */}
        {analysis.overall_score !== null && (
          <div className="flex flex-wrap items-center justify-center gap-6 rounded-lg bg-muted/30 p-4">
            <ScoreGauge
              score={analysis.overall_score}
              label="Overall"
            />
            {analysis.documentation_score !== null && (
              <ScoreGauge
                score={analysis.documentation_score}
                label="Documentation"
              />
            )}
            {analysis.clinical_appropriateness_score !== null && (
              <ScoreGauge
                score={analysis.clinical_appropriateness_score}
                label="Clinical"
              />
            )}
            {analysis.care_coordination_score !== null && (
              <ScoreGauge
                score={analysis.care_coordination_score}
                label="Care Coord."
              />
            )}
          </div>
        )}

        {/* Chart summary */}
        {analysis.chart_summary && (
          <CollapsibleSection
            title="Chart Summary"
            icon={FileText}
            defaultOpen
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              {analysis.chart_summary}
            </p>
          </CollapsibleSection>
        )}

        {/* Criteria scores */}
        {analysis.criteria_scores && analysis.criteria_scores.length > 0 && (
          <CollapsibleSection
            title="Criteria Scores"
            icon={BarChart3}
            defaultOpen
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterion</TableHead>
                  <TableHead className="text-center">AI Score</TableHead>
                  {reviewResult?.criteria_scores && (
                    <TableHead className="text-center">
                      Final Score
                    </TableHead>
                  )}
                  <TableHead>Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.criteria_scores.map(
                  (cs: CriterionScore, i: number) => {
                    const finalScore = reviewResult?.criteria_scores?.find(
                      (rs) => rs.criterion === cs.criterion
                    );
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {cs.criterion}
                            {cs.ai_flag && (
                              <AlertTriangle className="h-3 w-3 text-status-warning-dot" />
                            )}
                          </div>
                          {cs.flag_reason && (
                            <p className="mt-0.5 text-[10px] text-status-warning-dot">
                              {cs.flag_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="ai">{cs.score}</Badge>
                        </TableCell>
                        {reviewResult?.criteria_scores && (
                          <TableCell className="text-center">
                            {finalScore ? (
                              <Badge
                                variant={
                                  finalScore.score !== cs.score
                                    ? "warning"
                                    : "success"
                                }
                              >
                                {finalScore.score}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="max-w-xs text-xs text-muted-foreground">
                          {cs.rationale}
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          </CollapsibleSection>
        )}

        {/* Deficiencies */}
        {analysis.deficiencies && analysis.deficiencies.length > 0 && (
          <CollapsibleSection
            title={`Deficiencies (${analysis.deficiencies.length})`}
            icon={AlertTriangle}
            defaultOpen={false}
          >
            <div className="space-y-3">
              {analysis.deficiencies.map(
                (def: Deficiency, i: number) => (
                  <div
                    key={i}
                    className="rounded-md border bg-muted/20 p-3 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {def.type}
                      </span>
                      <SeverityBadge severity={def.severity} />
                    </div>
                    <p className="text-sm">{def.description}</p>
                    {def.chart_citation && (
                      <p className="text-xs italic text-muted-foreground">
                        Citation: {def.chart_citation}
                      </p>
                    )}
                    {def.recommendation && (
                      <p className="text-xs text-status-info-dot">
                        Recommendation: {def.recommendation}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Narrative draft */}
        {analysis.narrative_draft && (
          <CollapsibleSection
            title="Narrative Draft"
            icon={FileText}
            defaultOpen={false}
          >
            <div className="rounded-md border-l-4 border-status-success-fg/30 bg-mint-50 p-4 dark:bg-cobalt-700/20">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {analysis.narrative_draft}
              </p>
            </div>
          </CollapsibleSection>
        )}

        <Separator />

        {/* Re-trigger analysis button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerAnalysis}
            disabled={triggeringAnalysis}
          >
            {triggeringAnalysis ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Brain className="mr-2 h-3 w-3" />
            )}
            Re-run AI Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface TriggerAnalysisButtonProps {
  caseId: string;
}

export function TriggerAnalysisButton({ caseId }: TriggerAnalysisButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleTrigger() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to trigger analysis");
      window.location.reload();
    } catch (err) {
      console.error("Failed to trigger analysis:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleTrigger} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Brain className="mr-2 h-4 w-4" />
      )}
      Trigger AI Analysis
    </Button>
  );
}
