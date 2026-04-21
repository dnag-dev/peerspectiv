"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SCORE_LABELS: Record<number, string> = {
  1: "Deficient",
  2: "Below Standard",
  3: "Meets Standard",
  4: "Exceeds Standard",
};

interface CriteriaScorerProps {
  criterion: string;
  aiScore: number;
  aiScoreLabel: string;
  aiRationale: string;
  value: { score: number | null; rationale: string; agreed: boolean } | null;
  onChange: (value: {
    score: number;
    score_label: string;
    rationale: string;
    agreed: boolean;
  }) => void;
}

export function CriteriaScorer({
  criterion,
  aiScore,
  aiScoreLabel,
  aiRationale,
  value,
  onChange,
}: CriteriaScorerProps) {
  const [mode, setMode] = useState<"idle" | "agreed" | "override">(
    value?.agreed === true
      ? "agreed"
      : value?.agreed === false
        ? "override"
        : "idle"
  );
  const [overrideScore, setOverrideScore] = useState<string>(
    value && !value.agreed && value.score != null ? String(value.score) : ""
  );
  const [overrideReason, setOverrideReason] = useState<string>(
    value && !value.agreed ? value.rationale : ""
  );

  function handleAgree() {
    setMode("agreed");
    onChange({
      score: aiScore,
      score_label: aiScoreLabel,
      rationale: aiRationale,
      agreed: true,
    });
  }

  function handleOverrideToggle() {
    setMode("override");
    setOverrideScore("");
    setOverrideReason("");
  }

  function handleOverrideConfirm() {
    const score = Number(overrideScore);
    if (score < 1 || score > 4 || !overrideReason.trim()) return;
    onChange({
      score,
      score_label: SCORE_LABELS[score] || `Score ${score}`,
      rationale: overrideReason.trim(),
      agreed: false,
    });
  }

  function handleCancel() {
    setMode("idle");
    setOverrideScore("");
    setOverrideReason("");
  }

  const isScored = value?.score != null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 transition-colors",
        isScored && mode === "agreed" && "border-green-200 bg-green-50/30",
        isScored && mode === "override" && "border-amber-200 bg-amber-50/30",
        !isScored && "border-gray-200"
      )}
    >
      {/* Criterion Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">{criterion}</h4>
            <Badge variant="ai" className="text-[11px]">
              AI: {aiScore}/4
            </Badge>
            {isScored && mode === "agreed" && (
              <Badge variant="success" className="text-[11px]">
                Agreed
              </Badge>
            )}
            {isScored && mode === "override" && (
              <Badge variant="warning" className="text-[11px]">
                Overridden to {value?.score}/4
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {aiRationale}
          </p>
        </div>

        {/* Action Buttons */}
        {mode === "idle" && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAgree}
              className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              Agree
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOverrideToggle}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                />
              </svg>
              Override
            </Button>
          </div>
        )}

        {(mode === "agreed" || (mode === "override" && isScored)) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="shrink-0 text-xs text-gray-500"
          >
            Change
          </Button>
        )}
      </div>

      {/* Override Form */}
      {mode === "override" && !isScored && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-24">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Your Score
            </label>
            <Input
              type="number"
              min={1}
              max={4}
              step={1}
              value={overrideScore}
              onChange={(e) => setOverrideScore(e.target.value)}
              placeholder="1-4"
              className="h-9 bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Reason for Override
            </label>
            <Input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain your rationale..."
              className="h-9 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleOverrideConfirm}
              disabled={
                !overrideScore ||
                Number(overrideScore) < 1 ||
                Number(overrideScore) > 4 ||
                !overrideReason.trim()
              }
              className="h-9"
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-9"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
