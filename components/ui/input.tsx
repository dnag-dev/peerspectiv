import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary transition-colors focus-visible:outline-none focus-visible:border-cobalt-500 focus-visible:ring-[3px] focus-visible:ring-cobalt-300/30 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink-primary",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
