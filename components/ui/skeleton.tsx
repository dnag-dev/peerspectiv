import { cn } from "@/lib/utils";

/**
 * Pulse skeleton — cobalt-tinted shimmer (cobalt-50 ↔ ink-100).
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-ink-100",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-brand/5 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
