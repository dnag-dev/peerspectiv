"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Pulse button. Cobalt primary, white secondary, ghost. 8px radius.
 * Legacy variants kept as aliases for in-flight call sites.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cobalt-300/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-cobalt-700 text-white hover:bg-cobalt-800 active:bg-cobalt-800 shadow-sm",
        secondary:
          "border border-border-subtle bg-surface-card text-ink-primary hover:bg-ink-50 hover:border-border-default",
        ghost:
          "text-ink-secondary hover:bg-ink-100 hover:text-ink-primary",
        destructive:
          "bg-status-danger-dot text-white hover:bg-critical-700 shadow-sm",
        outline:
          "border border-border-subtle bg-surface-card text-ink-primary hover:bg-ink-50 hover:border-border-default",
        link:
          "text-status-info-fg underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-9 rounded-md px-3",
        lg:      "h-11 rounded-md px-6 text-[15px]",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
