import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Pulse status badge — dot-prefix recipe, lowercase mono-ish.
 * Variants map to lifecycle states. Legacy variants aliased.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-medium tracking-[0.02em] lowercase before:content-[''] before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:flex-shrink-0",
  {
    variants: {
      variant: {
        default:    "bg-ink-100 text-ink-primary",
        completed:  "bg-mint-100 text-status-success-fg",
        progress:   "bg-status-info-bg text-status-info-fg",
        pending:    "bg-ink-100 text-ink-secondary",
        overdue:    "bg-critical-100 text-status-danger-fg",
        assigned:   "bg-amber-100 text-status-warning-fg",
        approved:   "bg-mint-100 text-status-success-fg",
        paid:       "bg-brand-hover text-white/80",
        ai:         "bg-status-info-bg text-status-info-fg",
        // Legacy aliases
        secondary:    "bg-ink-100 text-ink-primary",
        destructive:  "bg-critical-100 text-status-danger-fg",
        outline:      "bg-surface-card text-ink-primary border border-border-subtle before:hidden pl-2",
        success:      "bg-mint-100 text-status-success-fg",
        warning:      "bg-amber-100 text-status-warning-fg",
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
