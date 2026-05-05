"use client";

import { ShieldCheck } from "lucide-react";

interface Props {
  /** MRN value, editable. */
  mrn: string;
  onMrnChange: (next: string) => void;
  /** Source of the MRN — drives the "AI-extracted, edit to correct" hint. */
  mrnSource: "manual" | "ai_extracted" | "corrected" | null;
  /** Peer name (locked, from session). */
  peerName: string;
  /** Peer license number (locked, from session). */
  licenseNumber: string;
  /** Peer license state (locked, from session). */
  licenseState: string;
}

/**
 * Phase 2 — System Attestation Block. Renders ABOVE the form questions on the
 * Conduct Review page. NOT a form question — peer name and license are pulled
 * from the logged-in peer's profile and locked. MRN is editable; if it was
 * AI-extracted and the peer edits it, mrn_source flips to 'corrected' on
 * submit (PR-036). Persisted to review_results at submit time (PR-039).
 */
export function AttestationBlock({
  mrn,
  onMrnChange,
  mrnSource,
  peerName,
  licenseNumber,
  licenseState,
}: Props) {
  const showAiHint = mrnSource === "ai_extracted";
  const showCorrectedHint = mrnSource === "corrected";

  return (
    <div
      data-testid="attestation-block"
      className="rounded-xl border-2 border-cobalt-200 bg-cobalt-50/40 p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-4 w-4 text-cobalt-700" />
        <div className="text-eyebrow text-cobalt-700">SYSTEM ATTESTATION</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* MRN — editable */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-700">
            MRN <span className="text-critical-600">*</span>
          </label>
          <input
            type="text"
            data-testid="attestation-mrn-input"
            value={mrn}
            onChange={(e) => onMrnChange(e.target.value.replace(/<[^>]*>/g, ""))}
            placeholder="Enter MRN"
            className="w-full rounded-lg border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-cobalt-700 focus:ring-1 focus:ring-cobalt-200"
          />
          {showAiHint && (
            <p className="mt-1 text-[11px] text-cobalt-700">
              AI-extracted — edit to correct.
            </p>
          )}
          {showCorrectedHint && (
            <p className="mt-1 text-[11px] text-amber-700">Corrected by peer.</p>
          )}
        </div>

        {/* Peer name — locked */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-700">
            Peer Name
          </label>
          <input
            type="text"
            data-testid="attestation-peer-name"
            value={peerName}
            readOnly
            className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700 cursor-not-allowed"
          />
        </div>

        {/* License — locked */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-700">
            License Number
          </label>
          <input
            type="text"
            data-testid="attestation-license"
            value={
              licenseNumber
                ? `${licenseState ? licenseState + "-" : ""}${licenseNumber}`
                : "—"
            }
            readOnly
            className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700 cursor-not-allowed"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-500">
        These values are snapshotted onto this review for HRSA audit (PR-039).
      </p>
    </div>
  );
}
