"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Practitioner button. Three real variants:
 *  - default (mint primary): the affirmative AI/action button
 *  - secondary (ink outline on paper): destructive-adjacent, neutral actions
 *  - ghost (no chrome): tertiary toolbar actions
 *
 * Legacy variants (`destructive`, `outline`, `link`) are kept as visual
 * aliases so existing screens keep compiling, but new code should pick from
 * the three above.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-600/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-mint-600 text-paper hover:bg-mint-700 active:bg-mint-700 shadow-sm",
        secondary:
          "border border-ink-200 bg-paper text-ink-900 hover:bg-ink-50 hover:border-ink-300",
        ghost:
          "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
        // Legacy aliases — map to closest Practitioner intent
        destructive:
          "bg-critical-600 text-paper hover:bg-critical-700 shadow-sm",
        outline:
          "border border-ink-200 bg-paper text-ink-900 hover:bg-ink-50 hover:border-ink-300",
        link:
          "text-mint-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-9 rounded-sm px-3",
        lg:      "h-11 rounded-sm px-6 text-[15px]",
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
