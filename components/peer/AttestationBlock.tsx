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
      className="rounded-xl border-2 border-status-info-fg/30 bg-status-info-bg/40 p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-4 w-4 text-status-info-fg" />
        <div className="text-eyebrow text-status-info-fg">SYSTEM ATTESTATION</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* MRN — editable */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-primary">
            MRN <span className="text-status-danger-dot">*</span>
          </label>
          <input
            type="text"
            data-testid="attestation-mrn-input"
            value={mrn}
            onChange={(e) => onMrnChange(e.target.value.replace(/<[^>]*>/g, ""))}
            placeholder="Enter MRN"
            className="w-full rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-status-info-fg focus:ring-1 focus:ring-brand/30"
          />
          {showAiHint && (
            <p className="mt-1 text-[11px] text-status-info-fg">
              AI-extracted — edit to correct.
            </p>
          )}
          {showCorrectedHint && (
            <p className="mt-1 text-[11px] text-status-warning-fg">Corrected by peer.</p>
          )}
        </div>

        {/* Peer name — locked */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-primary">
            Peer Name
          </label>
          <input
            type="text"
            data-testid="attestation-peer-name"
            value={peerName}
            readOnly
            className="w-full rounded-lg border border-border-subtle bg-ink-50 px-3 py-2 text-sm text-ink-primary cursor-not-allowed"
          />
        </div>

        {/* License — locked */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-primary">
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
            className="w-full rounded-lg border border-border-subtle bg-ink-50 px-3 py-2 text-sm text-ink-primary cursor-not-allowed"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-secondary">
        These values are snapshotted onto this review for HRSA audit (PR-039).
      </p>
    </div>
  );
}
