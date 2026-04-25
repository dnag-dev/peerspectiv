import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Practitioner status pill. Uppercase, mono, tight tracking — feels
 * like a clinical label, not a UI sticker. Variant names map to the
 * lifecycle states used across the app; legacy variant names are kept
 * as aliases so existing call sites keep compiling.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
  {
    variants: {
      variant: {
        // Lifecycle
        default:    "bg-ink-100 text-ink-700",
        completed:  "bg-mint-100 text-mint-700 border border-mint-600/30",
        progress:   "bg-info-100 text-info-600 border border-info-600/30",
        pending:    "bg-warning-100 text-warning-700 border border-warning-600/30",
        overdue:    "bg-critical-100 text-critical-700 border border-critical-600/30",
        approved:   "bg-mint-100 text-mint-700 border border-mint-600/30",
        paid:       "bg-authority-700 text-paper",
        ai:         "bg-mint-100 text-mint-700 border border-mint-600/30",
        // Legacy aliases
        secondary:    "bg-ink-100 text-ink-700",
        destructive:  "bg-critical-100 text-critical-700 border border-critical-600/30",
        outline:      "border border-ink-200 text-ink-700",
        success:      "bg-mint-100 text-mint-700 border border-mint-600/30",
        warning:      "bg-warning-100 text-warning-700 border border-warning-600/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
