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
        default:    "bg-ink-100 text-ink-700",
        completed:  "bg-mint-100 text-mint-700",
        progress:   "bg-cobalt-100 text-cobalt-700",
        pending:    "bg-ink-100 text-ink-600",
        overdue:    "bg-critical-100 text-critical-700",
        assigned:   "bg-amber-100 text-amber-700",
        approved:   "bg-mint-100 text-mint-700",
        paid:       "bg-cobalt-700 text-cobalt-50",
        ai:         "bg-cobalt-50 text-cobalt-700",
        // Legacy aliases
        secondary:    "bg-ink-100 text-ink-700",
        destructive:  "bg-critical-100 text-critical-700",
        outline:      "bg-paper-surface text-ink-700 border border-ink-200 before:hidden pl-2",
        success:      "bg-mint-100 text-mint-700",
        warning:      "bg-amber-100 text-amber-700",
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
