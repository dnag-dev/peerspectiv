import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-ink-200 bg-paper-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus-visible:outline-none focus-visible:border-cobalt-500 focus-visible:ring-[3px] focus-visible:ring-cobalt-300/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
