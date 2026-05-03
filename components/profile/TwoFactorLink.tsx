"use client";

/**
 * Phase 8.3 — 2FA management entry point.
 *
 * Renders a "Manage 2FA →" link that opens Clerk's hosted UserProfile route
 * (/user). When Clerk isn't configured (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 * unset, e.g. demo mode), the link renders disabled with a tooltip — we never
 * build a custom 2FA UI per spec.
 */
import { ShieldCheck } from "lucide-react";

export function TwoFactorLink() {
  const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!enabled) {
    return (
      <span
        title="Available with Clerk auth — not configured in this environment."
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs text-ink-400"
      >
        <ShieldCheck className="h-3.5 w-3.5" /> Manage 2FA →
      </span>
    );
  }

  return (
    <a
      href="/user"
      className="inline-flex items-center gap-1.5 rounded-md border border-cobalt-200 bg-white px-3 py-1.5 text-xs text-cobalt-700 transition-colors hover:bg-cobalt-50"
    >
      <ShieldCheck className="h-3.5 w-3.5" /> Manage 2FA →
    </a>
  );
}
